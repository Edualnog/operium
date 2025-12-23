"use client"

import { useState, useCallback, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { OperiumProfile, OperiumRole, canCreateEventType, OperiumEventType } from "@/lib/types/operium"

/**
 * Hook para gerenciar o perfil OPERIUM do usuário autenticado
 * Fornece informações de papel e helpers de permissão
 */
export function useOperiumProfile() {
    const [profile, setProfile] = useState<OperiumProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setProfile(null)
                return
            }

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
                    return
                }
                throw fetchError
            }

            setProfile(data)
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

    // Permission helpers
    const role = profile?.role ?? null
    const isAdmin = role === 'ADMIN'
    const isField = role === 'FIELD'
    const isWarehouse = role === 'WAREHOUSE'
    const hasProfile = profile !== null

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
        refreshProfile: fetchProfile,
        // Role info
        role,
        isAdmin,
        isField,
        isWarehouse,
        hasProfile,
        // Permission helpers
        canCreate,
        canManageProfiles,
        canManageVehicles,
        canManageInventory,
        canCreateVehicleExpense,
        canCreateVehicleStatus,
        canCreateItemIn,
        canCreateItemOut,
    }
}
