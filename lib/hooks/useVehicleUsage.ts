"use client"

import { useState, useCallback, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { VehicleUsageEvent } from "@/lib/types/vehicles"

export function useVehicleUsage(vehicleId: string) {
    const [usageEvents, setUsageEvents] = useState<VehicleUsageEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const fetchUsage = useCallback(async () => {
        if (!vehicleId) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicle_usage_events")
                .select(`
          *,
          colaboradores (
            id,
            nome
          )
        `)
                .eq("vehicle_id", vehicleId)
                .order("usage_date", { ascending: false })

            if (error) throw error
            setUsageEvents(data || [])
        } catch (err: any) {
            console.error("Error fetching usage events:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [vehicleId, supabase])

    useEffect(() => {
        fetchUsage()
    }, [fetchUsage])

    const addUsageEvent = async (event: Omit<VehicleUsageEvent, "id">) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicle_usage_events")
                .insert([event])
                .select()
                .single()

            if (error) throw error
            setUsageEvents((prev) => [data, ...prev])
            return data
        } catch (err: any) {
            console.error("Error adding usage event:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        usageEvents,
        loading,
        error,
        refreshUsage: fetchUsage,
        addUsageEvent,
    }
}
