"use client"

import { useVehicleCosts } from "@/lib/hooks/useVehicleCosts"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Plus, Trash2 } from "lucide-react"

export function VehicleCostList({ vehicleId }: { vehicleId: string }) {
    const { costs, loading, addCost, deleteCost } = useVehicleCosts(vehicleId)

    // TODO: Add form dialog for creating cost

    if (loading) return <div>Carregando custos...</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Histórico de Custos</h3>
                <Button size="sm" onClick={() => alert("Implementar formulário de custos")}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Custo
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mês Ref.</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Notas</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {costs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhum custo registrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            costs.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell>{format(new Date(c.reference_month), 'MM/yyyy')}</TableCell>
                                    <TableCell>{c.cost_type}</TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.amount)}
                                    </TableCell>
                                    <TableCell>{c.notes}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => deleteCost(c.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
