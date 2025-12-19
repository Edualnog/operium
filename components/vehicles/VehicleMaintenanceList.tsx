"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useVehicleMaintenances } from "@/lib/hooks/useVehicleMaintenances"
import { VehicleMaintenanceForm } from "./VehicleMaintenanceForm"
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
    const [isFormOpen, setIsFormOpen] = useState(false)
    const { t } = useTranslation('common')

    const handleSubmit = async (data: any) => {
        await addMaintenance(data)
    }

    if (loading) return <div>{t('vehicles.details.loading')}</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('vehicles.maintenance.title')}</h3>
                <Button size="sm" onClick={() => setIsFormOpen(true)} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                    <Plus className="mr-2 h-4 w-4" /> {t('vehicles.maintenance.new')}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('vehicles.maintenance.date')}</TableHead>
                            <TableHead>{t('vehicles.maintenance.type')}</TableHead>
                            <TableHead>{t('vehicles.maintenance.description')}</TableHead>
                            <TableHead>{t('vehicles.maintenance.cost')}</TableHead>
                            <TableHead>{t('vehicles.maintenance.next_date')}</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {maintenances.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {t('vehicles.details.not_found')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            maintenances.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell>{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{t(`vehicles.maintenance.types.${m.maintenance_type}`)}</TableCell>
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

            <VehicleMaintenanceForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleSubmit}
                vehicleId={vehicleId}
                loading={loading}
            />
        </div>
    )
}
