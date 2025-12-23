"use server"

import { cookies } from "next/headers"
import { createServerComponentClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

// Type for equipment in custody
export type EquipmentStatus = 'pending_acceptance' | 'accepted' | 'in_use' | 'pending_return' | 'returned' | 'returned_with_issue'

export interface TeamEquipmentMobile {
    id: string
    team_id: string
    ferramenta_id: string
    quantity: number
    assigned_at: string
    returned_at: string | null
    status: EquipmentStatus
    ferramenta_nome: string
    ferramenta_tipo?: string
}

// Get equipment in custody for user's team
export async function getMyTeamEquipment(): Promise<TeamEquipmentMobile[]> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get user's team_id
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("team_id, org_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.team_id) {
        return [] // User not in a team
    }

    // Get equipment in custody for this team
    const { data, error } = await supabase
        .from("team_equipment")
        .select(`
            id,
            team_id,
            ferramenta_id,
            quantity,
            assigned_at,
            returned_at,
            status,
            ferramentas (
                nome,
                tipo
            )
        `)
        .eq("team_id", profile.team_id)
        .is("returned_at", null)
        .order("assigned_at", { ascending: false })

    if (error) {
        console.error("Error fetching team equipment:", error)
        throw new Error("Erro ao carregar equipamentos")
    }

    return (data || []).map((item: any) => ({
        id: item.id,
        team_id: item.team_id,
        ferramenta_id: item.ferramenta_id,
        quantity: item.quantity,
        assigned_at: item.assigned_at,
        returned_at: item.returned_at,
        status: item.status || 'accepted',
        ferramenta_nome: item.ferramentas?.nome || "Sem nome",
        ferramenta_tipo: item.ferramentas?.tipo
    }))
}

// Get team info for user
export async function getMyTeamInfo() {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.team_id) return null

    const { data: team } = await supabase
        .from("teams")
        .select("id, name, status")
        .eq("id", profile.team_id)
        .single()

    return team
}

// Report equipment issue from mobile
export type IssueType = 'damage' | 'malfunction' | 'loss'

export async function reportEquipmentIssue(
    equipmentId: string,
    issue: {
        type: IssueType
        description: string
    }
) {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get equipment details
    const { data: equipment, error: eqError } = await supabase
        .from("team_equipment")
        .select("*, ferramentas(nome), teams(name)")
        .eq("id", equipmentId)
        .single()

    if (eqError || !equipment) {
        throw new Error("Equipamento não encontrado")
    }

    if (equipment.returned_at) {
        throw new Error("Este equipamento já foi devolvido")
    }

    // Get user profile info
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, name, team_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.org_id) {
        throw new Error("Perfil não encontrado")
    }

    // Check if user belongs to this team
    if (profile.team_id !== equipment.team_id) {
        throw new Error("Você não pertence a esta equipe")
    }

    // Log the issue event
    const { error: eventError } = await supabase.from("operium_events").insert({
        org_id: profile.org_id,
        actor_user_id: user.id,
        event_type: 'equipment_issue_reported',
        entity_type: 'team_equipment',
        entity_id: equipmentId,
        payload: {
            issue_type: issue.type,
            description: issue.description,
            ferramenta_nome: (equipment.ferramentas as any)?.nome,
            team_name: (equipment.teams as any)?.name,
            quantity: equipment.quantity,
            reporter_name: profile.name,
            reported_at: new Date().toISOString()
        }
    })

    if (eventError) {
        console.error("Error logging event:", eventError)
        throw new Error("Erro ao registrar problema")
    }

    revalidatePath("/app")
    return { success: true }
}

// Confirm equipment checklist (daily confirmation)
export async function confirmEquipmentChecklist(equipmentIds: string[]) {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, name, team_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.org_id || !profile?.team_id) {
        throw new Error("Perfil ou equipe não encontrado")
    }

    // Get team name
    const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", profile.team_id)
        .single()

    // Log the checklist confirmation
    const { error } = await supabase.from("operium_events").insert({
        org_id: profile.org_id,
        actor_user_id: user.id,
        event_type: 'equipment_checklist_confirmed',
        entity_type: 'team',
        entity_id: profile.team_id,
        payload: {
            equipment_ids: equipmentIds,
            equipment_count: equipmentIds.length,
            team_name: team?.name,
            confirmed_by: profile.name,
            confirmed_at: new Date().toISOString()
        }
    })

    if (error) {
        console.error("Error logging checklist:", error)
        throw new Error("Erro ao confirmar checklist")
    }

    revalidatePath("/app")
    return { success: true, count: equipmentIds.length }
}

// =============================================================================
// NEW EQUIPMENT WORKFLOW ACTIONS
// =============================================================================

// Get pending equipment acceptance for current user
export async function getPendingEquipmentAcceptance() {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get user's team_id
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("team_id, org_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.team_id) {
        return []
    }

    // Get equipment with pending_acceptance status
    const { data, error } = await supabase
        .from("team_equipment")
        .select(`
            id,
            team_id,
            ferramenta_id,
            quantity,
            assigned_at,
            status,
            ferramentas (
                nome,
                tipo
            ),
            teams (
                name
            )
        `)
        .eq("team_id", profile.team_id)
        .eq("status", "pending_acceptance")
        .is("returned_at", null)
        .order("assigned_at", { ascending: false })

    if (error) {
        console.error("Error fetching pending equipment:", error)
        return []
    }

    return (data || []).map((item: any) => ({
        id: item.id,
        team_id: item.team_id,
        ferramenta_id: item.ferramenta_id,
        quantity: item.quantity,
        assigned_at: item.assigned_at,
        status: item.status,
        ferramenta_nome: item.ferramentas?.nome || "Sem nome",
        ferramenta_tipo: item.ferramentas?.tipo,
        team_name: item.teams?.name
    }))
}

// Accept equipment assignment
export async function acceptEquipment(equipmentId: string) {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get user profile
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("team_id, org_id, name")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.team_id) {
        throw new Error("Você não está vinculado a nenhuma equipe")
    }

    // Verify equipment exists and is pending
    const { data: equipment, error: eqError } = await supabase
        .from("team_equipment")
        .select("*, ferramentas(nome), teams(name)")
        .eq("id", equipmentId)
        .single()

    if (eqError || !equipment) {
        throw new Error("Equipamento não encontrado")
    }

    if (equipment.team_id !== profile.team_id) {
        throw new Error("Este equipamento não pertence à sua equipe")
    }

    if (equipment.status !== 'pending_acceptance') {
        throw new Error("Este equipamento já foi aceito")
    }

    // Update equipment status
    const { error } = await supabase
        .from("team_equipment")
        .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by_user_id: user.id
        })
        .eq("id", equipmentId)

    if (error) {
        console.error("Error accepting equipment:", error)
        throw new Error("Erro ao aceitar equipamento")
    }

    // Log event
    if (profile.org_id) {
        await supabase.from("operium_events").insert({
            org_id: profile.org_id,
            actor_user_id: user.id,
            event_type: 'equipment_accepted',
            entity_type: 'team_equipment',
            entity_id: equipmentId,
            payload: {
                ferramenta_nome: (equipment.ferramentas as any)?.nome,
                team_name: (equipment.teams as any)?.name,
                quantity: equipment.quantity,
                accepted_by: profile.name,
                accepted_at: new Date().toISOString()
            }
        })
    }

    // Mark notification as read
    await supabase
        .from("equipment_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("team_equipment_id", equipmentId)
        .eq("user_id", user.id)

    revalidatePath("/app")
    return { success: true }
}

// Request equipment return (from collaborator side)
export async function requestEquipmentReturn(equipmentIds: string[]) {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, name, team_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.org_id || !profile?.team_id) {
        throw new Error("Perfil ou equipe não encontrado")
    }

    // Update all equipment to pending_return
    const now = new Date().toISOString()
    const { error } = await supabase
        .from("team_equipment")
        .update({
            status: 'pending_return',
            return_requested_at: now,
            return_requested_by_user_id: user.id
        })
        .in("id", equipmentIds)
        .eq("team_id", profile.team_id)

    if (error) {
        console.error("Error requesting return:", error)
        throw new Error("Erro ao solicitar devolução")
    }

    // Get team name
    const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", profile.team_id)
        .single()

    // Log event
    await supabase.from("operium_events").insert({
        org_id: profile.org_id,
        actor_user_id: user.id,
        event_type: 'equipment_return_requested',
        entity_type: 'team',
        entity_id: profile.team_id,
        payload: {
            equipment_ids: equipmentIds,
            equipment_count: equipmentIds.length,
            team_name: team?.name,
            requested_by: profile.name,
            requested_at: now
        }
    })

    revalidatePath("/app")
    return { success: true, count: equipmentIds.length }
}

// Get equipment notifications for current user
export async function getEquipmentNotifications() {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from("equipment_notifications")
        .select("*")
        .eq("user_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(20)

    if (error) {
        console.error("Error fetching notifications:", error)
        return []
    }

    return data || []
}

// Report field issue (damage/malfunction during operation)
export async function reportFieldIssue(
    equipmentId: string,
    issue: {
        type: 'damage' | 'malfunction' | 'loss' | 'wear' | 'other'
        severity: 'low' | 'medium' | 'high' | 'critical'
        description: string
        location?: string
    }
) {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get user profile
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, name, team_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.org_id) {
        throw new Error("Perfil não encontrado")
    }

    // Get equipment details
    const { data: equipment, error: eqError } = await supabase
        .from("team_equipment")
        .select("*, ferramentas(nome), teams(name)")
        .eq("id", equipmentId)
        .single()

    if (eqError || !equipment) {
        throw new Error("Equipamento não encontrado")
    }

    if (equipment.team_id !== profile.team_id) {
        throw new Error("Você não pertence a esta equipe")
    }

    // Create issue record
    const { error: issueError } = await supabase
        .from("equipment_issues")
        .insert({
            team_equipment_id: equipmentId,
            reported_by_user_id: user.id,
            org_id: profile.org_id,
            issue_type: issue.type,
            severity: issue.severity,
            description: issue.description,
            location: issue.location
        })

    if (issueError) {
        console.error("Error creating issue:", issueError)
        throw new Error("Erro ao registrar problema")
    }

    // Log event
    await supabase.from("operium_events").insert({
        org_id: profile.org_id,
        actor_user_id: user.id,
        event_type: 'equipment_issue_reported',
        entity_type: 'team_equipment',
        entity_id: equipmentId,
        payload: {
            issue_type: issue.type,
            severity: issue.severity,
            description: issue.description,
            location: issue.location,
            ferramenta_nome: (equipment.ferramentas as any)?.nome,
            team_name: (equipment.teams as any)?.name,
            reporter_name: profile.name,
            reported_at: new Date().toISOString()
        }
    })

    revalidatePath("/app")
    return { success: true }
}
