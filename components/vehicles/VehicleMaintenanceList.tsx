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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-base sm:text-lg font-medium">{t('vehicles.maintenance.title')}</h3>
                <Button size="sm" onClick={() => setIsFormOpen(true)} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> {t('vehicles.maintenance.new')}
                </Button>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs sm:text-sm whitespace-nowrap">{t('vehicles.maintenance.date')}</TableHead>
                            <TableHead className="text-xs sm:text-sm whitespace-nowrap">{t('vehicles.maintenance.type')}</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">{t('vehicles.maintenance.description')}</TableHead>
                            <TableHead className="text-xs sm:text-sm whitespace-nowrap">{t('vehicles.maintenance.cost')}</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell whitespace-nowrap">{t('vehicles.maintenance.next_date')}</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {maintenances.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-20 text-center text-sm">
                                    {t('vehicles.details.not_found')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            maintenances.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell className="text-sm py-2 whitespace-nowrap">{format(new Date(m.maintenance_date), 'dd/MM/yy')}</TableCell>
                                    <TableCell className="text-sm py-2">{t(`vehicles.maintenance.types.${m.maintenance_type}`)}</TableCell>
                                    <TableCell className="text-sm py-2 hidden md:table-cell max-w-[200px] truncate">{m.description}</TableCell>
                                    <TableCell className="text-sm py-2 whitespace-nowrap">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.cost)}
                                    </TableCell>
                                    <TableCell className="text-sm py-2 hidden lg:table-cell whitespace-nowrap">
                                        {m.next_maintenance_date ? format(new Date(m.next_maintenance_date), 'dd/MM/yy') : '-'}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteMaintenance(m.id)}>
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
