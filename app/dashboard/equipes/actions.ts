"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { Team, TeamStatus, TeamMember, TeamEquipment } from "./types"

// --- TEAMS ---

export async function getTeams(): Promise<Team[]> {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("v_teams_summary")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching teams:", error)
        return []
    }

    return data as Team[]
}

export async function createTeam(formData: {
    name: string
    description?: string
    leader_id?: string
    vehicle_id?: string
    status?: TeamStatus
}) {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("teams")
        .insert({
            name: formData.name,
            description: formData.description,
            leader_id: formData.leader_id || null,
            vehicle_id: formData.vehicle_id || null,
            status: formData.status || 'active'
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to create team: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return data
}

export async function updateTeam(id: string, formData: {
    name?: string
    description?: string
    leader_id?: string
    vehicle_id?: string
    status?: TeamStatus
}) {
    const supabase = createServerActionClient({ cookies })

    // Clean undefined/empty string values for optional fields
    const updates: any = { ...formData }
    if (updates.leader_id === "") updates.leader_id = null
    if (updates.vehicle_id === "") updates.vehicle_id = null

    const { data, error } = await supabase
        .from("teams")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to update team: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return data
}

// --- MEMBERS ---

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("team_members")
        .select(`
      *,
      colaboradores (
        nome,
        foto_url,
        cargo
      )
    `)
        .eq("team_id", teamId)
        .order("joined_at", { ascending: false })

    if (error) {
        console.error("Error fetching team members:", error)
        return []
    }

    // Flatten the response for easier consumption
    return data.map((item: any) => ({
        ...item,
        colaborador_nome: item.colaboradores?.nome,
        colaborador_foto: item.colaboradores?.foto_url,
        colaborador_cargo: item.colaboradores?.cargo
    })) as TeamMember[]
}

export async function addTeamMember(teamId: string, colaboradorId: string, role?: string) {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("team_members")
        .insert({
            team_id: teamId,
            colaborador_id: colaboradorId,
            role: role
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to add member: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return data
}

export async function removeTeamMember(memberId: string) {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("team_members")
        .update({ left_at: new Date().toISOString() })
        .eq("id", memberId)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to remove member: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return data
}

// --- EQUIPMENT ---

export async function getTeamEquipment(teamId: string): Promise<TeamEquipment[]> {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("team_equipment")
        .select(`
      *,
      ferramentas (
        nome,
        tipo
      )
    `)
        .eq("team_id", teamId)
        .order("assigned_at", { ascending: false })

    if (error) {
        console.error("Error fetching team equipment:", error)
        return []
    }

    return data.map((item: any) => ({
        ...item,
        ferramenta_nome: item.ferramentas?.nome,
        ferramenta_tipo: item.ferramentas?.tipo
    })) as TeamEquipment[]
}

export async function assignEquipment(teamId: string, ferramentaId: string, quantity: number) {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("team_equipment")
        .insert({
            team_id: teamId,
            ferramenta_id: ferramentaId,
            quantity: quantity
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to assign equipment: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return data
}

export async function returnEquipment(assignmentId: string) {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("team_equipment")
        .update({ returned_at: new Date().toISOString() })
        .eq("id", assignmentId)
        .select()
        .single()

    if (error) {
        throw new Error(`Failed to return equipment: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return data
}
