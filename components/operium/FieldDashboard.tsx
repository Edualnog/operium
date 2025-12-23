"use client"

import { useState } from "react"
import { useOperiumEvents } from "@/lib/hooks/useOperiumEvents"
import { VehicleExpenseForm } from "./VehicleExpenseForm"
import { VehicleStatusForm } from "./VehicleStatusForm"
import { EventsList } from "./EventsList"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Truck, Wrench, AlertCircle, Plus } from "lucide-react"

export function FieldDashboard() {
    const [expenseOpen, setExpenseOpen] = useState(false)
    const [statusOpen, setStatusOpen] = useState(false)

    // Refresh handled by EventsList internally or via context/prop if needed
    // For simplicity, we just render the forms and list

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                    onClick={() => setExpenseOpen(true)}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            <Truck className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Nova Despesa</h3>
                            <p className="text-sm text-zinc-500">Registrar abastecimento ou gasto com veículo</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-amber-500 dark:hover:border-amber-500 transition-colors"
                    onClick={() => setStatusOpen(true)}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
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
