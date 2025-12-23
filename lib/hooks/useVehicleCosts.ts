"use client"

import { useState, useCallback, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { VehicleCost } from "@/lib/types/vehicles"

export function useVehicleCosts(vehicleId: string) {
    const [costs, setCosts] = useState<VehicleCost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClientComponentClient()

    const fetchCosts = useCallback(async () => {
        if (!vehicleId) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicle_costs")
                .select("*")
                .eq("vehicle_id", vehicleId)
                .order("reference_month", { ascending: false })

            if (error) throw error

            // Enrich with collaborator and team names
            const enrichedData = await Promise.all((data || []).map(async (cost: any) => {
                let collaboratorName = null
                let teamName = null

                // Get collaborator name from operium_profiles
                if (cost.collaborator_id) {
                    const { data: profile } = await supabase
                        .from("operium_profiles")
                        .select("user:user_id(raw_user_meta_data)")
                        .eq("user_id", cost.collaborator_id)
                        .single()

                    collaboratorName = profile?.user?.raw_user_meta_data?.full_name ||
                                      profile?.user?.raw_user_meta_data?.name ||
                                      'Usuário'
                }

                // Get team name
                if (cost.team_id) {
                    const { data: team } = await supabase
                        .from("teams")
                        .select("name")
                        .eq("id", cost.team_id)
                        .single()

                    teamName = team?.name
                }

                return {
                    ...cost,
                    collaborator_name: collaboratorName,
                    team_name: teamName
                }
            }))

            setCosts(enrichedData)
        } catch (err: any) {
            console.error("Error fetching costs:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [vehicleId, supabase])

    useEffect(() => {
        fetchCosts()
    }, [fetchCosts])

    const addCost = async (cost: Omit<VehicleCost, "id" | "created_at">) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from("vehicle_costs")
                .insert([cost])
                .select()
                .single()

            if (error) throw error
            setCosts((prev) => [data, ...prev])
            return data
        } catch (err: any) {
            console.error("Error adding cost:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const deleteCost = async (id: string) => {
        try {
            setLoading(true)
            const { error } = await supabase
                .from("vehicle_costs")
                .delete()
                .eq("id", id)

            if (error) throw error
            setCosts((prev) => prev.filter((c) => c.id !== id))
        } catch (err: any) {
            console.error("Error deleting cost:", err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        costs,
        loading,
        error,
        refreshCosts: fetchCosts,
        addCost,
        deleteCost,
    }
}
