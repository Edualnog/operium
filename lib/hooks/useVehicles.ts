"use client"

import { useState, useCallback, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Vehicle, VehicleType, FuelType } from "@/lib/types/vehicles"

export function useVehicles() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const fetchVehicles = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicles")
                .select("*")
                .order("created_at", { ascending: false })

            if (error) throw error

            setVehicles(data || [])
        } catch (err: any) {
            console.error("Error fetching vehicles:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchVehicles()
    }, [fetchVehicles])

    const addVehicle = async (vehicle: Omit<Vehicle, "id" | "created_at" | "updated_at" | "profile_id">) => {
        try {
            setLoading(true)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("User not found")

            // Logic updated: profile_id IS user.id. No need to look up organization.
            const { data, error } = await supabase
                .from("vehicles")
                .insert([{ ...vehicle, profile_id: user.id }])
                .select()
                .single()

            if (error) throw error

            setVehicles((prev) => [data, ...prev])
            return data
        } catch (err: any) {
            console.error("Error adding vehicle:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicles")
                .update(updates)
                .eq("id", id)
                .select()
                .single()

            if (error) throw error

            setVehicles((prev) => prev.map((v) => (v.id === id ? data : v)))
            return data
        } catch (err: any) {
            console.error("Error updating vehicle:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const deleteVehicle = async (id: string) => {
        try {
            setLoading(true)
            const { error } = await supabase
                .from("vehicles")
                .delete()
                .eq("id", id)

            if (error) throw error

            setVehicles((prev) => prev.filter((v) => v.id !== id))
        } catch (err: any) {
            console.error("Error deleting vehicle:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        vehicles,
        loading,
        error,
        refreshVehicles: fetchVehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
    }
}

export function useVehicle(id: string) {
    const [vehicle, setVehicle] = useState<Vehicle | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const fetchVehicle = useCallback(async () => {
        if (!id) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicles")
                .select("*")
                .eq("id", id)
                .single()

            if (error) throw error
            setVehicle(data)
        } catch (err: any) {
            console.error("Error fetching vehicle:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [id, supabase])

    useEffect(() => {
        fetchVehicle()
    }, [fetchVehicle])

    return { vehicle, loading, error, refreshVehicle: fetchVehicle }
}
