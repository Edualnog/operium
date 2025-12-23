"use client"

import { useState, useCallback, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import {
    OperiumEvent,
    OperiumEventType,
    OperiumEventMetadata,
    CreateVehicleExpenseInput,
    CreateVehicleStatusInput,
    CreateItemMovementInput,
    VehicleExpenseMetadata,
    VehicleStatusMetadata,
    ItemInMetadata,
    ItemOutMetadata
} from "@/lib/types/operium"

interface UseOperiumEventsOptions {
    typeFilter?: OperiumEventType | OperiumEventType[] | null
    limit?: number
}

/**
 * Hook para gerenciar eventos operacionais OPERIUM
 * Eventos são imutáveis (append-only)
 */
export function useOperiumEvents(options: UseOperiumEventsOptions = {}) {
    const { typeFilter = null, limit = 50 } = options

    const [events, setEvents] = useState<OperiumEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            let query = supabase
                .from("operium_events")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limit)

            if (typeFilter) {
                if (Array.isArray(typeFilter)) {
                    if (typeFilter.length > 0) {
                        query = query.in("type", typeFilter)
                    }
                } else {
                    query = query.eq("type", typeFilter)
                }
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError

            setEvents(data || [])
        } catch (err: any) {
            console.error("Error fetching OPERIUM events:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [supabase, typeFilter, limit])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    // ============================================================================
    // CREATE VEHICLE EXPENSE
    // ============================================================================
    const createVehicleExpense = async (input: CreateVehicleExpenseInput) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // Get user's org_id from operium_profiles
        const { data: profile } = await supabase
            .from("operium_profiles")
            .select("org_id")
            .eq("user_id", user.id)
            .single()

        if (!profile) throw new Error("OPERIUM profile not found")

        const metadata: VehicleExpenseMetadata = {
            valor: input.valor,
            tipo: input.tipo,
            observacoes: input.observacoes,
        }

        const { data, error } = await supabase
            .from("operium_events")
            .insert({
                org_id: profile.org_id,
                type: 'VEHICLE_EXPENSE' as OperiumEventType,
                actor_user_id: user.id,
                target_id: input.vehicle_id,
                metadata,
            })
            .select()
            .single()

        if (error) throw error

        setEvents(prev => [data, ...prev])
        return data
    }

    // ============================================================================
    // CREATE VEHICLE STATUS
    // ============================================================================
    const createVehicleStatus = async (input: CreateVehicleStatusInput) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data: profile } = await supabase
            .from("operium_profiles")
            .select("org_id")
            .eq("user_id", user.id)
            .single()

        if (!profile) throw new Error("OPERIUM profile not found")

        const metadata: VehicleStatusMetadata = {
            status_novo: input.status,
            observacoes: input.observacoes,
        }

        const { data, error } = await supabase
            .from("operium_events")
            .insert({
                org_id: profile.org_id,
                type: 'VEHICLE_STATUS' as OperiumEventType,
                actor_user_id: user.id,
                target_id: input.vehicle_id,
                metadata,
            })
            .select()
            .single()

        if (error) throw error

        setEvents(prev => [data, ...prev])
        return data
    }

    // ============================================================================
    // CREATE ITEM MOVEMENT (IN/OUT)
    // ============================================================================
    const createItemMovement = async (input: CreateItemMovementInput) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data: profile } = await supabase
            .from("operium_profiles")
            .select("org_id")
            .eq("user_id", user.id)
            .single()

        if (!profile) throw new Error("OPERIUM profile not found")

        let metadata: ItemInMetadata | ItemOutMetadata

        if (input.type === 'ITEM_IN') {
            metadata = {
                quantidade: input.quantidade,
                fornecedor: input.fornecedor,
                observacoes: input.observacoes,
            } as ItemInMetadata
        } else {
            metadata = {
                quantidade: input.quantidade,
                colaborador_id: input.colaborador_id,
                observacoes: input.observacoes,
            } as ItemOutMetadata
        }

        const { data, error } = await supabase
            .from("operium_events")
            .insert({
                org_id: profile.org_id,
                type: input.type,
                actor_user_id: user.id,
                target_id: input.item_id,
                metadata,
            })
            .select()
            .single()

        if (error) throw error

        setEvents(prev => [data, ...prev])
        return data
    }

    return {
        events,
        loading,
        error,
        refreshEvents: fetchEvents,
        // Event creators
        createVehicleExpense,
        createVehicleStatus,
        createItemMovement,
    }
}

// ============================================================================
// HOOK FOR FETCHING OPERIUM VEHICLES (for selects)
// ============================================================================
export function useOperiumVehicles() {
    const [vehicles, setVehicles] = useState<{ id: string; plate: string; model?: string }[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from("operium_vehicles")
                .select("id, plate, model")
                .order("plate")

            setVehicles(data || [])
            setLoading(false)
        }
        fetch()
    }, [supabase])

    return { vehicles, loading }
}

// ============================================================================
// HOOK FOR FETCHING OPERIUM INVENTORY ITEMS (for selects)
// ============================================================================
export function useOperiumInventory() {
    const [items, setItems] = useState<{ id: string; name: string; quantity: number }[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from("operium_inventory_items")
                .select("id, name, quantity")
                .order("name")

            setItems(data || [])
            setLoading(false)
        }
        fetch()
    }, [supabase])

    return { items, loading }
}
