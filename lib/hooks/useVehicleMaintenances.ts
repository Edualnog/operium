"use client"

import { useState, useCallback, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { VehicleMaintenance } from "@/lib/types/vehicles"

export function useVehicleMaintenances(vehicleId: string) {
    const [maintenances, setMaintenances] = useState<VehicleMaintenance[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const fetchMaintenances = useCallback(async () => {
        if (!vehicleId) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicle_maintenances")
                .select("*")
                .eq("vehicle_id", vehicleId)
                .order("maintenance_date", { ascending: false })

            if (error) throw error
            setMaintenances(data || [])
        } catch (err: any) {
            console.error("Error fetching maintenances:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [vehicleId, supabase])

    useEffect(() => {
        fetchMaintenances()
    }, [fetchMaintenances])

    const addMaintenance = async (maintenance: Omit<VehicleMaintenance, "id" | "created_at">) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicle_maintenances")
                .insert([maintenance])
                .select()
                .single()

            if (error) throw error
            setMaintenances((prev) => [data, ...prev])
            return data
        } catch (err: any) {
            console.error("Error adding maintenance:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const deleteMaintenance = async (id: string) => {
        try {
            setLoading(true)
            const { error } = await supabase
                .from("vehicle_maintenances")
                .delete()
                .eq("id", id)

            if (error) throw error
            setMaintenances((prev) => prev.filter((m) => m.id !== id))
        } catch (err: any) {
            console.error("Error deleting maintenance:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        maintenances,
        loading,
        error,
        refreshMaintenances: fetchMaintenances,
        addMaintenance,
        deleteMaintenance,
    }
}
