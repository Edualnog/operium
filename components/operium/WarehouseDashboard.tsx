"use client"

import { useState } from "react"
import { useOperiumEvents } from "@/lib/hooks/useOperiumEvents"
import { InventoryMovementForm } from "./InventoryMovementForm"
import { EventsList } from "./EventsList"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, ArrowRightLeft, Plus } from "lucide-react"

export function WarehouseDashboard() {
    const [movementOpen, setMovementOpen] = useState(false)

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                    className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                    onClick={() => setMovementOpen(true)}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                            <ArrowRightLeft className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Movimentação de Estoque</h3>
                            <p className="text-sm text-zinc-500">Registrar entrada ou saída de itens</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Movimentações Recentes
                </h2>

                {/* Only show inventory events */}
                <EventsList typeFilter={['ITEM_IN', 'ITEM_OUT']} />
            </div>

            <InventoryMovementForm open={movementOpen} onOpenChange={setMovementOpen} />
        </div>
    )
}
