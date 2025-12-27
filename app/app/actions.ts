"use server"

import { cookies } from "next/headers"
import { createServerComponentClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

// =============================================================================
// GET AVAILABLE TEAMS FOR FIELD APP ONBOARDING
// =============================================================================

export interface AvailableTeam {
    id: string
    name: string
}

/**
 * Get all teams available for the user to join during field app onboarding.
 * Uses a SECURITY DEFINER function to bypass RLS and fetch all teams
 * in the user's organization.
 */
export async function getAvailableTeams(): Promise<AvailableTeam[]> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        console.error("[getAvailableTeams] User not authenticated")
        return []
    }

    // Use the SECURITY DEFINER function to get teams
    // This bypasses RLS and returns all teams for the user's org
    const { data: teams, error } = await supabase
        .rpc('get_teams_for_user_org')

    if (error) {
        console.error("[getAvailableTeams] RPC error:", error)
        return []
    }

    console.log("[getAvailableTeams] Found teams:", teams?.length || 0)
    return (teams || []) as AvailableTeam[]
}

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
                nome
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
        ferramenta_nome: item.ferramentas?.nome || "Sem nome"
    }))
}

// Get team info for user
export interface TeamMemberInfo {
    id: string
    name: string
    role: string | null
    photo: string | null
}

export interface MyTeamInfo {
    id: string
    name: string
    status: string
    current_location: string | null
    leader_id: string | null
    leader_name: string | null
    leader_photo: string | null
    vehicle_id: string | null
    vehicle_plate: string | null
    vehicle_model: string | null
    members: TeamMemberInfo[]
}

export async function getMyTeamInfo(): Promise<MyTeamInfo | null> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Use SECURITY DEFINER function to bypass RLS and get full team info
    const { data, error } = await supabase.rpc('get_my_team_info')

    if (error) {
        console.error("[getMyTeamInfo] RPC error:", error)
        return null
    }

    if (!data) return null

    // Parse the JSON result
    const teamData = data as {
        id: string
        name: string
        status: string
        current_location: string | null
        leader_id: string | null
        leader_name: string | null
        leader_photo: string | null
        vehicle_id: string | null
        vehicle_plate: string | null
        vehicle_model: string | null
        members: Array<{
            id: string
            name: string
            role: string | null
            photo: string | null
        }>
    }

    return {
        id: teamData.id,
        name: teamData.name,
        status: teamData.status,
        current_location: teamData.current_location,
        leader_id: teamData.leader_id,
        leader_name: teamData.leader_name,
        leader_photo: teamData.leader_photo,
        vehicle_id: teamData.vehicle_id,
        vehicle_plate: teamData.vehicle_plate,
        vehicle_model: teamData.vehicle_model,
        members: teamData.members || []
    }
}

// =============================================================================
// GET INDIVIDUAL VEHICLE FOR COLLABORATOR (without team)
// =============================================================================

export interface MyVehicleInfo {
    id: string
    plate: string
    model: string | null
}

/**
 * Get the vehicle assigned directly to the current user (via current_driver_id).
 * Used for collaborators without a team who have a vehicle assigned individually.
 */
export async function getMyIndividualVehicle(): Promise<MyVehicleInfo | null> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get user's colaborador record
    const { data: colaborador } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!colaborador) return null

    // Get vehicle assigned to this colaborador
    const { data: vehicle, error } = await supabase
        .from("vehicles")
        .select("id, plate, model")
        .eq("current_driver_id", colaborador.id)
        .maybeSingle()

    if (error || !vehicle) return null

    return {
        id: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model
    }
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
                nome
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
        photo_url?: string
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
            location: issue.location,
            photo_url: issue.photo_url
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
            photo_url: issue.photo_url,
            ferramenta_nome: (equipment.ferramentas as any)?.nome,
            team_name: (equipment.teams as any)?.name,
            reporter_name: profile.name,
            reported_at: new Date().toISOString()
        }
    })

    revalidatePath("/app")
    return { success: true }
}

// =============================================================================
// TEAM MANAGEMENT ACTIONS (JOIN/LEAVE)
// =============================================================================

/**
 * Leave current team - collaborator can unlink from their team
 */
export async function leaveTeam() {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get current profile
    const { data: profile, error: profileError } = await supabase
        .from("operium_profiles")
        .select("team_id, org_id, name")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (profileError || !profile) {
        throw new Error("Perfil não encontrado")
    }

    if (!profile.team_id) {
        throw new Error("Você não está vinculado a nenhuma equipe")
    }

    const previousTeamId = profile.team_id

    // Get team name for event
    const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", previousTeamId)
        .single()

    // Update profile to remove team
    const { error: updateError } = await supabase
        .from("operium_profiles")
        .update({ team_id: null })
        .eq("user_id", user.id)

    if (updateError) {
        console.error("Error leaving team:", updateError)
        throw new Error("Erro ao sair da equipe")
    }

    // Log event for real-time tracking on dashboard
    if (profile.org_id) {
        await supabase.from("operium_events").insert({
            org_id: profile.org_id,
            actor_user_id: user.id,
            event_type: 'collaborator_left_team',
            entity_type: 'team',
            entity_id: previousTeamId,
            payload: {
                team_name: team?.name,
                collaborator_name: profile.name,
                left_at: new Date().toISOString()
            }
        })
    }

    revalidatePath("/app")
    return { success: true, previousTeamName: team?.name }
}

/**
 * Join a team - collaborator can link to a new team
 */
export async function joinTeam(teamId: string) {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get current profile
    const { data: profile, error: profileError } = await supabase
        .from("operium_profiles")
        .select("team_id, org_id, name")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (profileError || !profile) {
        throw new Error("Perfil não encontrado")
    }

    // Verify the team exists and belongs to same org
    const { data: teams } = await supabase.rpc('get_teams_for_user_org')

    const targetTeam = teams?.find((t: any) => t.id === teamId)
    if (!targetTeam) {
        throw new Error("Equipe não encontrada ou não pertence à sua organização")
    }

    const previousTeamId = profile.team_id

    // Update profile with new team
    const { error: updateError } = await supabase
        .from("operium_profiles")
        .update({ team_id: teamId })
        .eq("user_id", user.id)

    if (updateError) {
        console.error("Error joining team:", updateError)
        throw new Error("Erro ao entrar na equipe")
    }

    // Get previous team name if any
    let previousTeamName = null
    if (previousTeamId) {
        const { data: prevTeam } = await supabase
            .from("teams")
            .select("name")
            .eq("id", previousTeamId)
            .single()
        previousTeamName = prevTeam?.name
    }

    // Log event for real-time tracking on dashboard
    if (profile.org_id) {
        await supabase.from("operium_events").insert({
            org_id: profile.org_id,
            actor_user_id: user.id,
            event_type: 'collaborator_joined_team',
            entity_type: 'team',
            entity_id: teamId,
            payload: {
                team_name: targetTeam.name,
                previous_team_id: previousTeamId,
                previous_team_name: previousTeamName,
                collaborator_name: profile.name,
                joined_at: new Date().toISOString()
            }
        })
    }

    revalidatePath("/app")
    return { success: true, teamName: targetTeam.name }
}

/**
 * Get current team status for the collaborator
 */
export async function getMyTeamStatus() {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { hasTeam: false, teamId: null, teamName: null }

    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.team_id) {
        return { hasTeam: false, teamId: null, teamName: null }
    }

    // Get team name
    const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", profile.team_id)
        .single()

    return {
        hasTeam: true,
        teamId: profile.team_id,
        teamName: team?.name || "Equipe sem nome"
    }
}

// =============================================================================
// GET COLLABORATOR SCORE FOR FIELD APP
// =============================================================================

export interface MyScoreInfo {
    score: number
    percentile: number | null // Top X% of organization (lower is better)
    trend: 'up' | 'down' | 'stable'
}

/**
 * Get the current user's collaborator score (responsibility rating)
 * Returns score value and ranking percentile within organization
 */
export async function getMyScore(): Promise<MyScoreInfo | null> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get user's operium profile to find org_id and collaborator_id
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, collaborator_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    if (!profile?.org_id) return null

    // Try to find collaborator - first by collaborator_id, then by user_id
    let myColaborador: { id: string; almox_score: number | null } | null = null

    if (profile.collaborator_id) {
        // Direct link via collaborator_id
        const { data } = await supabase
            .from("colaboradores")
            .select("id, almox_score")
            .eq("id", profile.collaborator_id)
            .single()
        myColaborador = data
    }

    if (!myColaborador) {
        // No colaborador found - return default score for users without colaborador link
        return {
            score: 500,
            percentile: null,
            trend: 'stable'
        }
    }

    if (!myColaborador) {
        // Still not found - return default score for new users
        return {
            score: 500,
            percentile: null,
            trend: 'stable'
        }
    }

    const myScore = myColaborador.almox_score || 500

    // Get all collaborators' scores in the same org to calculate percentile
    let percentile: number | null = null
    if (profile.org_id) {
        const { data: allColaboradores } = await supabase
            .from("colaboradores")
            .select("almox_score")
            .eq("profile_id", profile.org_id)
            .not("almox_score", "is", null)

        if (allColaboradores && allColaboradores.length > 1) {
            // Sort scores descending (higher is better)
            const sortedScores = allColaboradores
                .map(c => c.almox_score || 500)
                .sort((a, b) => b - a)

            // Find position (0-indexed)
            const position = sortedScores.findIndex(s => s <= myScore)
            percentile = Math.round((position / sortedScores.length) * 100)
        }
    }

    return {
        score: myScore,
        percentile,
        trend: 'stable' // TODO: calculate trend based on historical data
    }
}

// =============================================================================
// GET FULL RANKING FOR FIELD APP
// =============================================================================

export interface RankingCollaborator {
    id: string
    name: string
    photo_url: string | null
    score: number
    position: number
    is_current_user: boolean
}

/**
 * Get full ranking of all collaborators in the organization
 * Uses SECURITY DEFINER function for proper organization isolation
 */
export async function getFullRanking(): Promise<RankingCollaborator[]> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Get user's collaborator_id to identify current user in list
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("collaborator_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    // Use SECURITY DEFINER function for organization-scoped ranking
    const { data: colaboradores, error } = await supabase.rpc('get_my_org_ranking')

    if (error || !colaboradores) {
        console.error("[getFullRanking] RPC Error:", error)
        return []
    }

    // Map and assign positions
    const sorted = (colaboradores as Array<{ id: string, nome: string, foto_url: string | null, almox_score: number }>)
        .map((c, index) => ({
            id: c.id,
            name: c.nome || "Sem nome",
            photo_url: c.foto_url,
            score: c.almox_score || 500,
            position: index + 1,
            is_current_user: c.id === profile?.collaborator_id
        }))

    return sorted
}

// =============================================================================
// STREAK SYSTEM - Gamification
// =============================================================================

export interface StreakInfo {
    currentStreak: number
    maxStreak: number
    lastActivityDate: string | null
    status: 'active_today' | 'needs_action' | 'streak_lost' | 'no_streak'
}

/**
 * Get the current user's streak information
 */
export async function getMyStreak(): Promise<StreakInfo | null> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc('get_my_streak')

    if (error) {
        console.error("[getMyStreak] Error:", error)
        // Fallback: return default values if function doesn't exist yet
        return {
            currentStreak: 0,
            maxStreak: 0,
            lastActivityDate: null,
            status: 'no_streak'
        }
    }

    const streakData = data?.[0]
    if (!streakData) {
        return {
            currentStreak: 0,
            maxStreak: 0,
            lastActivityDate: null,
            status: 'no_streak'
        }
    }

    return {
        currentStreak: streakData.current_streak || 0,
        maxStreak: streakData.max_streak || 0,
        lastActivityDate: streakData.last_activity_date,
        status: streakData.streak_status as StreakInfo['status']
    }
}

export interface StreakUpdateResult {
    newStreak: number
    isNewRecord: boolean
    message: 'first_activity' | 'same_day' | 'streak_continued' | 'streak_reset'
}

/**
 * Manually update streak for a colaborador (called after successful actions)
 */
export async function updateMyStreak(): Promise<StreakUpdateResult | null> {
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get colaborador_id
    const { data: profile } = await supabase
        .from('profiles_operium')
        .select('colaborador_id')
        .eq('profile_id', user.id)
        .single()

    if (!profile?.colaborador_id) return null

    const { data, error } = await supabase.rpc('update_colaborador_streak', {
        p_colaborador_id: profile.colaborador_id
    })

    if (error) {
        console.error("[updateMyStreak] Error:", error)
        return null
    }

    const result = data?.[0]
    if (!result) return null

    return {
        newStreak: result.new_streak,
        isNewRecord: result.is_new_record,
        message: result.streak_message as StreakUpdateResult['message']
    }
}
