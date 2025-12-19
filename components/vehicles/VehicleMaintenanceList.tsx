"use client"

import { useVehicleMaintenances } from "@/lib/hooks/useVehicleMaintenances"
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

export function VehicleMaintenanceList({ vehicleId }: { vehicleId: string }) {
    const { maintenances, loading, addMaintenance, deleteMaintenance } = useVehicleMaintenances(vehicleId)

    // TODO: Add form dialog for creating maintenance
    // For now, simpler implementation or placeholder for form

    if (loading) return <div>Carregando manutenções...</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Histórico de Manutenções</h3>
                <Button size="sm" onClick={() => alert("Implementar formulário de manutenção")}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Manutenção
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Custo</TableHead>
                            <TableHead>Próxima</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {maintenances.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Nenhuma manutenção registrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            maintenances.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell>{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{m.maintenance_type}</TableCell>
                                    <TableCell>{m.description}</TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.cost)}
                                    </TableCell>
                                    <TableCell>
                                        {m.next_maintenance_date ? format(new Date(m.next_maintenance_date), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => deleteMaintenance(m.id)}>
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
