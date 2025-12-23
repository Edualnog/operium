"use client"

import { useState, useCallback, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { OperiumProfile, OperiumRole, canCreateEventType, OperiumEventType } from "@/lib/types/operium"

/**
 * Hook para gerenciar o perfil OPERIUM do usuário autenticado
 * Fornece informações de papel, helpers de permissão e auto-criação de ADMIN
 */
export function useOperiumProfile() {
    const [profile, setProfile] = useState<OperiumProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const [userName, setUserName] = useState<string | null>(null)

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setProfile(null)
                setUserId(null)
                setUserName(null)
                return
            }

            setUserId(user.id)

            const { data, error: fetchError } = await supabase
                .from("operium_profiles")
                .select("*")
                .eq("user_id", user.id)
                .eq("active", true)
                .single()

            if (fetchError) {
                // PGRST116 = no rows found (user doesn't have OPERIUM profile)
                if (fetchError.code === 'PGRST116') {
                    setProfile(null)
                    setUserName(null)
                    return
                }
                throw fetchError
            }

            setProfile(data)

            // Get user name from profile or auth metadata
            const name = data?.name ||
                        user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] ||
                        'Usuário'
            setUserName(name)
        } catch (err: any) {
            console.error("Error fetching OPERIUM profile:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchProfile()
    }, [fetchProfile])

    /**
     * Cria perfil ADMIN automaticamente para o dono da conta
     * Usa RPC function com SECURITY DEFINER para bypass do RLS
     */
    const createAdminProfile = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("User not authenticated")

            // Chamar RPC function que faz bypass do RLS
            const { data, error } = await supabase
                .rpc('operium_create_admin_profile')

            if (error) throw error

            setProfile(data)
            return data
        } catch (err: any) {
            console.error("Error creating ADMIN profile:", err)
            throw err
        }
    }, [supabase])

    /**
     * Adiciona um colaborador à organização (apenas ADMIN)
     */
    const addTeamMember = useCallback(async (
        targetUserId: string,
        role: 'FIELD' | 'WAREHOUSE'
    ) => {
        if (!profile?.org_id) throw new Error("No org_id found")

        const { data, error } = await supabase
            .from("operium_profiles")
            .insert({
                user_id: targetUserId,
                org_id: profile.org_id,
                role,
                active: true,
            })
            .select()
            .single()

        if (error) {
            // Duplicate key violation (PK is user_id)
            if (error.code === '23505') {
                // Check if profile exists and is visible (in my org)
                const { data: existing } = await supabase
                    .from('operium_profiles')
                    .select('*')
                    .eq('user_id', targetUserId)
                    .maybeSingle()

                if (existing) {
                    if (existing.active) {
                        throw new Error("Este usuário já faz parte da equipe")
                    } else {
                        // Reactivate user
                        const { data: updated, error: updateError } = await supabase
                            .from('operium_profiles')
                            .update({ active: true, role, org_id: profile.org_id })
                            .eq('user_id', targetUserId)
                            .select()
                            .single()

                        if (updateError) throw updateError
                        return updated
                    }
                } else {
                    // Profile exists but not visible (likely other org)
                    throw new Error("Este usuário já está vinculado a outra organização")
                }
            }
            throw error
        }
        return data
    }, [supabase, profile?.org_id])

    /**
     * Atualiza role de um membro da equipe
     */
    const updateMemberRole = useCallback(async (
        targetUserId: string,
        newRole: OperiumRole
    ) => {
        if (!profile?.org_id) throw new Error("No org_id found")

        const { data, error } = await supabase
            .from("operium_profiles")
            .update({ role: newRole })
            .eq("user_id", targetUserId)
            .eq("org_id", profile.org_id)
            .select()
            .single()

        if (error) throw error
        return data
    }, [supabase, profile?.org_id])

    /**
     * Desativa membro da equipe
     */
    const deactivateMember = useCallback(async (targetUserId: string) => {
        if (!profile?.org_id) throw new Error("No org_id found")

        const { error } = await supabase
            .from("operium_profiles")
            .update({ active: false })
            .eq("user_id", targetUserId)
            .eq("org_id", profile.org_id)

        if (error) throw error
    }, [supabase, profile?.org_id])

    // Permission helpers
    const role = profile?.role ?? null
    const orgId = profile?.org_id ?? null
    const isAdmin = role === 'ADMIN'
    const isField = role === 'FIELD'
    const isWarehouse = role === 'WAREHOUSE'
    const hasProfile = profile !== null

    // Verifica se o usuário é o dono da organização
    const isOrgOwner = userId !== null && orgId === userId

    const canCreate = useCallback((eventType: OperiumEventType): boolean => {
        if (!role) return false
        return canCreateEventType(role, eventType)
    }, [role])

    const canManageProfiles = isAdmin
    const canManageVehicles = isAdmin
    const canManageInventory = isAdmin
    const canCreateVehicleExpense = isAdmin || isField
    const canCreateVehicleStatus = isAdmin || isField
    const canCreateItemIn = isAdmin || isWarehouse
    const canCreateItemOut = isAdmin || isWarehouse

    return {
        profile,
        loading,
        error,
        userId,
        orgId,
        userName,
        refreshProfile: fetchProfile,
        // Role info
        role,
        isAdmin,
        isField,
        isWarehouse,
        hasProfile,
        isOrgOwner,
        // Permission helpers
        canCreate,
        canManageProfiles,
        canManageVehicles,
        canManageInventory,
        canCreateVehicleExpense,
        canCreateVehicleStatus,
        canCreateItemIn,
        canCreateItemOut,
        // Admin actions
        createAdminProfile,
        addTeamMember,
        updateMemberRole,
        deactivateMember,
    }
}

/**
 * Hook para listar membros da equipe OPERIUM
 */
export function useOperiumTeam() {
    const [members, setMembers] = useState<OperiumProfile[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()
    const { orgId, isAdmin } = useOperiumProfile()

    const fetchMembers = useCallback(async () => {
        if (!orgId || !isAdmin) {
            setMembers([])
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("operium_profiles")
                .select("*")
                .eq("org_id", orgId)
                .order("created_at", { ascending: true })

            if (error) throw error
            setMembers(data || [])
        } catch (err) {
            console.error("Error fetching team:", err)
        } finally {
            setLoading(false)
        }
    }, [supabase, orgId, isAdmin])

    useEffect(() => {
        fetchMembers()
    }, [fetchMembers])

    return { members, loading, refreshMembers: fetchMembers }
}
