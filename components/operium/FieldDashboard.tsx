"use client"

import { useState, useEffect } from "react"
import { useOperiumProfile } from "@/lib/hooks/useOperiumProfile"
import { VehicleExpenseForm } from "./VehicleExpenseForm"
import { VehicleStatusForm } from "./VehicleStatusForm"
import { EventsList } from "./EventsList"
import { Card, CardContent } from "@/components/ui/card"
import { Truck, Wrench, Users, Car } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"

interface TeamInfo {
    id: string
    name: string
    vehicle_model?: string | null
    vehicle_plate?: string | null
    leader_name?: string | null
}

export function FieldDashboard() {
    const { profile } = useOperiumProfile()
    const [expenseOpen, setExpenseOpen] = useState(false)
    const [statusOpen, setStatusOpen] = useState(false)
    const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null)
    const supabase = createClientComponentClient()

    // Fetch team info with vehicle
    useEffect(() => {
        const fetchTeamInfo = async () => {
            if (!profile?.team_id) return

            const { data, error } = await supabase
                .from("teams")
                .select(`
                    id,
                    name,
                    vehicles:vehicle_id (
                        model,
                        plate
                    ),
                    leader:leader_id (
                        nome
                    )
                `)
                .eq("id", profile.team_id)
                .single()

            if (error) {
                console.error("Error fetching team info:", error)
                return
            }

            if (data) {
                setTeamInfo({
                    id: data.id,
                    name: data.name,
                    vehicle_model: (data.vehicles as any)?.model,
                    vehicle_plate: (data.vehicles as any)?.plate,
                    leader_name: (data.leader as any)?.nome
                })
            }
        }

        fetchTeamInfo()
    }, [profile?.team_id, supabase])

    return (
        <div className="space-y-6">
            {/* Team & Vehicle Header (Minimal) */}
            {teamInfo && (
                <div className="flex flex-wrap items-center gap-3 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {/* Team Name */}
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-zinc-400" />
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{teamInfo.name}</span>
                    </div>

                    {/* Separator */}
                    {teamInfo.vehicle_model && (
                        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-600" />
                    )}

                    {/* Vehicle Info */}
                    {teamInfo.vehicle_model && (
                        <div className="flex items-center gap-2 text-sm">
                            <Car className="h-4 w-4 text-zinc-400" />
                            <span className="text-zinc-600 dark:text-zinc-400">
                                {teamInfo.vehicle_model}
                            </span>
                            {teamInfo.vehicle_plate && (
                                <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-xs font-mono text-zinc-700 dark:text-zinc-300">
                                    {teamInfo.vehicle_plate}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    onClick={() => setExpenseOpen(true)}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <Truck className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Nova Despesa</h3>
                            <p className="text-sm text-zinc-500">Registrar abastecimento ou gasto com veículo</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    onClick={() => setStatusOpen(true)}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <Wrench className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Status do Veículo</h3>
                            <p className="text-sm text-zinc-500">Atualizar condição (Oficina, Ativo, etc)</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Suas Atividades Recentes
                </h2>

                {/* Only show vehicle events */}
                <EventsList typeFilter={['VEHICLE_EXPENSE', 'VEHICLE_STATUS']} />
            </div>

            <VehicleExpenseForm open={expenseOpen} onOpenChange={setExpenseOpen} />
            <VehicleStatusForm open={statusOpen} onOpenChange={setStatusOpen} />
        </div>
    )
}
