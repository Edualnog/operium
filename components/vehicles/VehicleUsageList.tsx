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
import { ptBR } from "date-fns/locale"
import { Fuel, AlertCircle, Activity, Loader2 } from "lucide-react"

const EVENT_ICONS: Record<string, any> = {
    'DESPESA': Fuel,
    'STATUS': AlertCircle,
}

const EVENT_COLORS: Record<string, string> = {
    'DESPESA': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'STATUS': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export function VehicleUsageList({ vehicleId }: { vehicleId: string }) {
    const { usageEvents, loading } = useVehicleUsage(vehicleId)
    const { t } = useTranslation('common')

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('vehicles.details.tabs.usage')}</h3>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
                            <TableHead className="text-xs uppercase tracking-wide font-medium">Data</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide font-medium">Evento</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide font-medium">Colaborador</TableHead>
                            <TableHead className="text-xs uppercase tracking-wide font-medium">Descrição</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {usageEvents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                                    <Activity className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                                    <p>Nenhuma atividade registrada</p>
                                    <p className="text-sm">Despesas e mudanças de status aparecerão aqui.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            usageEvents.map((e) => {
                                const Icon = EVENT_ICONS[e.usage_type] || Activity
                                const colorClass = EVENT_COLORS[e.usage_type] || 'bg-zinc-100 text-zinc-600'
                                return (
                                    <TableRow key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                        <TableCell className="text-sm">
                                            {format(new Date(e.usage_date), "dd/MM/yyyy", { locale: ptBR })}
                                            <span className="text-zinc-400 text-xs ml-1">
                                                {format(new Date(e.usage_date), "HH:mm")}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                                <Icon className="h-3 w-3" />
                                                {e.usage_type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-zinc-700 dark:text-zinc-300">
                                            {(e as any).colaboradores?.nome || '—'}
                                        </TableCell>
                                        <TableCell className="text-sm text-zinc-600 dark:text-zinc-400 max-w-[300px] truncate">
                                            {e.notes || '—'}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
