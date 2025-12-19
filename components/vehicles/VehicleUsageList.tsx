"use client"

import { useVehicleUsage } from "@/lib/hooks/useVehicleUsage"
import { useTranslation } from "react-i18next"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

export function VehicleUsageList({ vehicleId }: { vehicleId: string }) {
    const { usageEvents, loading } = useVehicleUsage(vehicleId)
    const { t } = useTranslation('common')

    if (loading) return <div>{t('vehicles.details.loading')}</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('vehicles.tabs.usage')}</h3>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('vehicles.usage.date')}</TableHead>
                            <TableHead>{t('vehicles.usage.event')}</TableHead>
                            <TableHead>{t('vehicles.usage.collaborator')}</TableHead>
                            <TableHead>{t('vehicles.usage.notes')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {usageEvents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    {t('vehicles.details.not_found')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            usageEvents.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell>{format(new Date(e.usage_date), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell>{e.usage_type}</TableCell>
                                    <TableCell>{(e as any).colaboradores?.nome || '-'}</TableCell>
                                    <TableCell>{e.notes}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
