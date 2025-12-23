"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useVehicleCosts } from "@/lib/hooks/useVehicleCosts"
import { VehicleCostForm } from "./VehicleCostForm"
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
import { Plus, Trash2, FileText, ExternalLink } from "lucide-react"

export function VehicleCostList({ vehicleId }: { vehicleId: string }) {
    const { costs, loading, addCost, deleteCost } = useVehicleCosts(vehicleId)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const { t } = useTranslation('common')

    const handleSubmit = async (data: any) => {
        await addCost(data)
    }

    if (loading) return <div>{t('vehicles.details.loading')}</div>

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('vehicles.costs.title')}</h3>
                <Button size="sm" onClick={() => setIsFormOpen(true)} className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
                    <Plus className="mr-2 h-4 w-4" /> {t('vehicles.costs.new')}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('vehicles.costs.month')}</TableHead>
                            <TableHead>{t('vehicles.costs.type')}</TableHead>
                            <TableHead>{t('vehicles.costs.amount')}</TableHead>
                            <TableHead>Registrado por</TableHead>
                            <TableHead>{t('vehicles.costs.notes')}</TableHead>
                            <TableHead>Comprovante</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {costs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {t('vehicles.details.not_found')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            costs.map((c: any) => (
                                <TableRow key={c.id}>
                                    <TableCell>{format(new Date(c.reference_month), 'MM/yyyy')}</TableCell>
                                    <TableCell>{t(`vehicles.costs.types.${c.cost_type}`)}</TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.amount)}
                                    </TableCell>
                                    <TableCell>
                                        {c.collaborator_name ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-neutral-900">{c.collaborator_name}</span>
                                                {c.team_name && (
                                                    <span className="text-xs text-neutral-500">{c.team_name}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-neutral-400 text-sm">Admin</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{c.notes}</TableCell>
                                    <TableCell>
                                        {c.receipt_url ? (
                                            <a
                                                href={c.receipt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Ver
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : (
                                            <span className="text-neutral-400 text-sm">-</span>
                                        )}
                                    </TableCell>
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

            <VehicleCostForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleSubmit}
                vehicleId={vehicleId}
                loading={loading}
            />
        </div>
    )
}
