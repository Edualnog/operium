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

    // Get current user for profile_id
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        throw new Error("Usuário não autenticado")
    }

    // Get user's org_id from operium_profiles
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    const { data, error } = await supabase
        .from("teams")
        .insert({
            profile_id: user.id,
            org_id: profile?.org_id || null, // Include org_id for multi-tenant isolation
            name: formData.name,
            description: formData.description,
            leader_id: formData.leader_id || null,
            vehicle_id: formData.vehicle_id || null,
            status: formData.status || 'active'
        })
        .select()
        .single()

    if (error) {
        throw new Error(`Falha ao criar equipe: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return data
}

export async function deleteTeam(teamId: string) {
    const supabase = createServerActionClient({ cookies })

    // Check if team has active equipment assignments
    const { data: activeEquipment } = await supabase
        .from("team_equipment")
        .select("id")
        .eq("team_id", teamId)
        .is("returned_at", null)
        .limit(1)

    if (activeEquipment && activeEquipment.length > 0) {
        throw new Error("Não é possível excluir equipe com equipamentos em custódia. Devolva todos os equipamentos primeiro.")
    }

    // Soft delete the team (preserve historical reports)
    const { error } = await supabase
        .from("teams")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", teamId)

    if (error) {
        console.error("Error deleting team:", error)
        throw new Error(`Falha ao excluir equipe: ${error.message}`)
    }

    revalidatePath("/dashboard/equipes")
    return { success: true }
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
        nome
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
        ferramenta_nome: item.ferramentas?.nome
    })) as TeamEquipment[]
}

export async function assignEquipment(teamId: string, ferramentaId: string, quantity: number) {
    console.log("[assignEquipment] START", { teamId, ferramentaId, quantity })

    const supabase = createServerActionClient({ cookies })

    // Validate quantity
    if (quantity < 1) {
        console.error("[assignEquipment] FAIL: quantity < 1")
        throw new Error("Quantidade deve ser pelo menos 1")
    }

    // Verify team exists and user has access
    console.log("[assignEquipment] Checking team...")
    const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", teamId)
        .single()

    if (teamError) {
        console.error("[assignEquipment] FAIL: teamError", teamError)
        throw new Error(`Equipe não encontrada: ${teamError.message}`)
    }
    if (!team) {
        console.error("[assignEquipment] FAIL: team is null")
        throw new Error("Equipe não encontrada ou sem permissão de acesso")
    }
    console.log("[assignEquipment] Team found:", team.name)

    // Verify ferramenta exists and check status + stock
    console.log("[assignEquipment] Checking ferramenta...")
    const { data: ferramenta, error: ferramentaError } = await supabase
        .from("ferramentas")
        .select("id, nome, estado, quantidade_disponivel, profile_id")
        .eq("id", ferramentaId)
        .single()

    if (ferramentaError) {
        console.error("[assignEquipment] FAIL: ferramentaError", ferramentaError)
        throw new Error(`Ferramenta não encontrada: ${ferramentaError.message}`)
    }
    if (!ferramenta) {
        console.error("[assignEquipment] FAIL: ferramenta is null")
        throw new Error("Ferramenta não encontrada")
    }
    console.log("[assignEquipment] Ferramenta found:", ferramenta.nome, "estado:", ferramenta.estado, "disponivel:", ferramenta.quantidade_disponivel)

    // Only block if explicitly in maintenance or damaged state
    const blockedStates = ['danificada', 'em_conserto']
    if (ferramenta.estado && blockedStates.includes(ferramenta.estado.toLowerCase())) {
        console.error("[assignEquipment] FAIL: blocked state", ferramenta.estado)
        throw new Error(`Ferramenta "${ferramenta.nome}" não está disponível (status: ${ferramenta.estado})`)
    }

    // Check stock availability
    if (ferramenta.quantidade_disponivel < quantity) {
        console.error("[assignEquipment] FAIL: insufficient stock", ferramenta.quantidade_disponivel, "<", quantity)
        throw new Error(`Estoque insuficiente para "${ferramenta.nome}". Disponível: ${ferramenta.quantidade_disponivel}, Solicitado: ${quantity}`)
    }

    // Check if already assigned to this team (not returned)
    console.log("[assignEquipment] Checking existing assignment...")
    const { data: existing, error: existingError } = await supabase
        .from("team_equipment")
        .select("id")
        .eq("team_id", teamId)
        .eq("ferramenta_id", ferramentaId)
        .is("returned_at", null)
        .maybeSingle()  // Use maybeSingle instead of single to avoid error when not found

    if (existingError) {
        console.error("[assignEquipment] FAIL: existingError", existingError)
    }

    if (existing) {
        console.error("[assignEquipment] FAIL: already assigned", existing)
        throw new Error(`"${ferramenta.nome}" já está em custódia desta equipe`)
    }
    console.log("[assignEquipment] No existing assignment found")

    // Create the assignment (custody record)
    console.log("[assignEquipment] Inserting team_equipment...")
    const { data, error } = await supabase
        .from("team_equipment")
        .insert({
            team_id: teamId,
            ferramenta_id: ferramentaId,
            quantity: quantity,
            status: 'pending_acceptance'  // Explicitly set status
        })
        .select()
        .single()

    if (error) {
        console.error("[assignEquipment] FAIL: insert error", error)
        // Handle specific error codes
        if (error.code === '42501') {
            throw new Error("Sem permissão para atribuir equipamentos a esta equipe")
        }
        if (error.code === '23503') {
            throw new Error("Referência inválida: equipe ou ferramenta não existe")
        }
        throw new Error(`Falha ao iniciar custódia: ${error.message}`)
    }

    // --- SYNC WITH MOVIMENTACOES (RETIRADA) ---
    try {
        console.log("[assignEquipment] Syncing movimentacoes...", {
            profile_id: ferramenta.profile_id,
            ferramenta_id: ferramentaId,
            tipo: 'retirada',
            quantidade: quantity,
            team_name: team.name
        })

        const { data: movData, error: movError } = await supabase.from("movimentacoes").insert({
            profile_id: ferramenta.profile_id,
            ferramenta_id: ferramentaId,
            tipo: 'retirada',
            quantidade: quantity,
            data: new Date().toISOString(),
            observacoes: `Retirada para equipe: ${team.name}`
        })

        if (movError) {
            console.error("[assignEquipment] ERROR: movimentacoes sync failed", {
                error: movError,
                code: movError.code,
                message: movError.message,
                details: movError.details,
                hint: movError.hint
            })
        } else {
            console.log("[assignEquipment] SUCCESS: movimentacoes synced", movData)
        }
    } catch (movError) {
        console.error("[assignEquipment] EXCEPTION: Failed to sync movimentacoes", movError)
    }
    // ------------------------------------------

    console.log("[assignEquipment] SUCCESS", data)
    revalidatePath("/dashboard/equipes")
    revalidatePath("/dashboard/estoque")  // Sync stock page
    return data
}

export async function returnEquipment(assignmentId: string) {
    const supabase = createServerActionClient({ cookies })

    // Verify assignment exists and hasn't been returned already
    const { data: existing, error: existingError } = await supabase
        .from("team_equipment")
        .select("id, returned_at, ferramenta_id, quantity, ferramentas(nome), teams(name)")
        .eq("id", assignmentId)
        .single()

    if (existingError || !existing) {
        throw new Error("Registro de custódia não encontrado")
    }

    if (existing.returned_at) {
        throw new Error("Este equipamento já foi devolvido")
    }

    const { data, error } = await supabase
        .from("team_equipment")
        .update({ returned_at: new Date().toISOString() })
        .eq("id", assignmentId)
        .select()
        .single()

    if (error) {
        if (error.code === '42501') {
            throw new Error("Sem permissão para registrar devolução")
        }
        throw new Error(`Falha ao encerrar custódia: ${error.message}`)
    }

    // --- SYNC WITH MOVIMENTACOES (DEVOLUCAO) ---
    try {
        // Need profile_id from existing assignment or fetch it.
        // Since we have existing record, let's fetch profile_id from tools if needed, 
        // but 'team_equipment' doesn't usually store profile_id directly unless added.
        // Let's fetch the tool's profile_id to be safe.
        const { data: toolData } = await supabase
            .from("ferramentas")
            .select("profile_id")
            .eq("id", existing.ferramenta_id)
            .single()

        if (toolData) {
            await supabase.from("movimentacoes").insert({
                profile_id: toolData.profile_id,
                ferramenta_id: existing.ferramenta_id,
                tipo: 'devolucao',
                quantidade: (existing as any).quantity || 1, // Cast safely
                data: new Date().toISOString(),
                observacoes: `Devolução de equipe: ${(existing.teams as any)?.name || 'Equipe'}`
            })
        }
    } catch (movError) {
        console.error("[returnEquipment] WARN: Failed to sync movimentacoes", movError)
    }
    // ------------------------------------------

    revalidatePath("/dashboard/equipes")
    revalidatePath("/dashboard/estoque")  // Sync stock page
    return data
}

// --- CUSTODY OPERATIONS ---

export type DiscrepancyType = 'loss' | 'damage' | 'shortage'

export async function returnEquipmentWithDiscrepancy(
    assignmentId: string,
    discrepancy: {
        type: DiscrepancyType
        notes: string
        quantityReturned?: number
    }
) {
    const supabase = createServerActionClient({ cookies })

    // Verify assignment exists
    const { data: existing, error: existingError } = await supabase
        .from("team_equipment")
        .select("*, ferramentas(nome), teams(name)")
        .eq("id", assignmentId)
        .single()

    if (existingError || !existing) {
        throw new Error("Registro de custódia não encontrado")
    }

    if (existing.returned_at) {
        throw new Error("Este equipamento já foi devolvido")
    }

    // Get user info for event logging
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, name")
        .eq("user_id", user?.id)
        .eq("active", true)
        .single()

    // Update the equipment record with return and discrepancy info
    const { data, error } = await supabase
        .from("team_equipment")
        .update({
            returned_at: new Date().toISOString(),
            notes: `[DIVERGÊNCIA: ${discrepancy.type.toUpperCase()}] ${discrepancy.notes}${discrepancy.quantityReturned !== undefined
                ? ` | Quantidade devolvida: ${discrepancy.quantityReturned}/${existing.quantity}`
                : ''
                }`
        })
        .eq("id", assignmentId)
        .select()
        .single()

    if (error) {
        throw new Error(`Falha ao registrar divergência: ${error.message}`)
    }

    // --- SYNC WITH MOVIMENTACOES (DEVOLUCAO COM DIVERGENCIA) ---
    try {
        const { data: toolData } = await supabase
            .from("ferramentas")
            .select("profile_id")
            .eq("id", existing.ferramenta_id)
            .single()

        if (toolData) {
            await supabase.from("movimentacoes").insert({
                profile_id: toolData.profile_id,
                ferramenta_id: existing.ferramenta_id,
                tipo: 'devolucao',
                quantidade: discrepancy.quantityReturned !== undefined ? discrepancy.quantityReturned : existing.quantity,
                data: new Date().toISOString(),
                observacoes: `Devolução de equipe: ${(existing.teams as any)?.name} | [DIVERGÊNCIA: ${discrepancy.type.toUpperCase()}] ${discrepancy.notes}`
            })
        }
    } catch (movError) {
        console.error("[returnEquipmentWithDiscrepancy] WARN: Failed to sync movimentacoes", movError)
    }
    // ------------------------------------------

    // Log the discrepancy event in operium_events
    if (profile?.org_id) {
        await supabase.from("operium_events").insert({
            org_id: profile.org_id,
            actor_user_id: user?.id,
            event_type: 'custody_discrepancy',
            entity_type: 'team_equipment',
            entity_id: assignmentId,
            payload: {
                discrepancy_type: discrepancy.type,
                ferramenta_nome: (existing.ferramentas as any)?.nome,
                team_name: (existing.teams as any)?.name,
                quantity_original: existing.quantity,
                quantity_returned: discrepancy.quantityReturned,
                notes: discrepancy.notes,
                actor_name: profile.name
            }
        })
    }

    revalidatePath("/dashboard/equipes")
    return data
}

export async function endTeamOperation(teamId: string, returnedItems: string[]) {
    const supabase = createServerActionClient({ cookies })

    // Verify team exists
    const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", teamId)
        .single()

    if (teamError || !team) {
        throw new Error("Equipe não encontrada")
    }

    // Return all specified items
    const results = []
    for (const assignmentId of returnedItems) {
        try {
            const result = await returnEquipment(assignmentId)
            results.push({ id: assignmentId, success: true, data: result })
        } catch (error: any) {
            results.push({ id: assignmentId, success: false, error: error.message })
        }
    }

    // Get user info for event logging
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, name")
        .eq("user_id", user?.id)
        .eq("active", true)
        .single()

    // Log operation end event
    if (profile?.org_id) {
        await supabase.from("operium_events").insert({
            org_id: profile.org_id,
            actor_user_id: user?.id,
            event_type: 'team_operation_ended',
            entity_type: 'team',
            entity_id: teamId,
            payload: {
                team_name: team.name,
                items_returned: results.filter(r => r.success).length,
                items_failed: results.filter(r => !r.success).length,
                actor_name: profile.name
            }
        })
    }

    revalidatePath("/dashboard/equipes")
    return {
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
    }
}

// --- ADMIN VALIDATION ---

export async function adminValidateReturn(equipmentIds: string[]) {
    const supabase = createServerActionClient({ cookies })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
        throw new Error("Não autenticado")
    }

    // Get user profile
    const { data: profile } = await supabase
        .from("operium_profiles")
        .select("org_id, name")
        .eq("user_id", user.id)
        .eq("active", true)
        .single()

    const now = new Date().toISOString()
    const results = []

    for (const equipmentId of equipmentIds) {
        try {
            // Verify equipment exists and is pending return
            const { data: equipment, error: eqError } = await supabase
                .from("team_equipment")
                .select("*, ferramentas(nome), teams(name)")
                .eq("id", equipmentId)
                .single()

            if (eqError || !equipment) {
                results.push({ id: equipmentId, success: false, error: "Não encontrado" })
                continue
            }

            if (equipment.status !== 'pending_return') {
                results.push({ id: equipmentId, success: false, error: "Não está pendente de devolução" })
                continue
            }

            // Update equipment to returned
            const { error } = await supabase
                .from("team_equipment")
                .update({
                    status: 'returned',
                    returned_at: now,
                    admin_validated_at: now,
                    admin_validated_by: user.id
                })
                .eq("id", equipmentId)

            if (error) {
                results.push({ id: equipmentId, success: false, error: error.message })
                continue
            }

            results.push({ id: equipmentId, success: true })

            // --- SYNC WITH MOVIMENTACOES (DEVOLUCAO) ---
            try {
                const { data: toolData } = await supabase
                    .from("ferramentas")
                    .select("profile_id")
                    .eq("id", equipment.ferramenta_id)
                    .single()

                if (toolData) {
                    await supabase.from("movimentacoes").insert({
                        profile_id: toolData.profile_id,
                        ferramenta_id: equipment.ferramenta_id,
                        tipo: 'devolucao',
                        quantidade: equipment.quantity || 1,
                        data: now,
                        observacoes: `Devolução de equipe: ${(equipment.teams as any)?.name || 'Equipe'}`
                    })
                    console.log("[adminValidateReturn] Movimentação de devolução registrada")
                }
            } catch (movError) {
                console.error("[adminValidateReturn] Erro ao registrar movimentação:", movError)
            }
            // ------------------------------------------

            // Log event
            if (profile?.org_id) {
                await supabase.from("operium_events").insert({
                    org_id: profile.org_id,
                    actor_user_id: user.id,
                    event_type: 'equipment_return_validated',
                    entity_type: 'team_equipment',
                    entity_id: equipmentId,
                    payload: {
                        ferramenta_nome: (equipment.ferramentas as any)?.nome,
                        team_name: (equipment.teams as any)?.name,
                        validated_by: profile.name,
                        validated_at: now
                    }
                })
            }
        } catch (error: any) {
            results.push({ id: equipmentId, success: false, error: error.message })
        }
    }

    revalidatePath("/dashboard/equipes")
    return {
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results
    }
}

// Get equipment pending validation for admin
export async function getPendingReturnValidation(teamId: string) {
    const supabase = createServerActionClient({ cookies })

    const { data, error } = await supabase
        .from("team_equipment")
        .select(`
            *,
            ferramentas (
                nome
            )
        `)
        .eq("team_id", teamId)
        .eq("status", "pending_return")
        .is("returned_at", null)
        .order("return_requested_at", { ascending: false })

    if (error) {
        console.error("Error fetching pending returns:", error)
        return []
    }

    return data.map((item: any) => ({
        ...item,
        ferramenta_nome: item.ferramentas?.nome
    })) as TeamEquipment[]
}

