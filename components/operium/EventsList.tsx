"use client"

import { useState } from "react"
import { useOperiumEvents } from "@/lib/hooks/useOperiumEvents"
import { OperiumEvent, OperiumEventType } from "@/lib/types/operium"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Fuel,
    ArrowDownToLine,
    ArrowUpFromLine,
    Activity,
    Filter,
    Calendar,
    User,
    Package,
    Truck
} from "lucide-react"

const EVENT_CONFIG: Record<OperiumEventType, {
    label: string
    icon: React.ReactNode
    color: string
    bgColor: string
}> = {
    VEHICLE_EXPENSE: {
        label: "Despesa de Veículo",
        icon: <Fuel className="h-4 w-4" />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    VEHICLE_STATUS: {
        label: "Status de Veículo",
        icon: <Activity className="h-4 w-4" />,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    ITEM_IN: {
        label: "Entrada de Item",
        icon: <ArrowDownToLine className="h-4 w-4" />,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    ITEM_OUT: {
        label: "Saída de Item",
        icon: <ArrowUpFromLine className="h-4 w-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
}

interface EventsListProps {
    typeFilter?: OperiumEventType | null
    limit?: number
    showFilters?: boolean
}

export function EventsList({
    typeFilter: initialFilter = null,
    limit = 50,
    showFilters = true
}: EventsListProps) {
    const [typeFilter, setTypeFilter] = useState<OperiumEventType | null>(initialFilter)
    const { events, loading, error } = useOperiumEvents({ typeFilter, limit })

    if (loading) {
        return (
            <div className="p-8 text-center text-zinc-500">
                Carregando eventos...
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                Erro ao carregar eventos: {error}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            {showFilters && (
                <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <Filter className="h-4 w-4 text-zinc-500" />
                    <Select
                        value={typeFilter || "all"}
                        onValueChange={(value) => setTypeFilter(value === "all" ? null : value as OperiumEventType)}
                    >
                        <SelectTrigger className="w-[200px] h-9 bg-white dark:bg-zinc-900">
                            <SelectValue placeholder="Filtrar por tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os tipos</SelectItem>
                            <SelectItem value="VEHICLE_EXPENSE">Despesa de Veículo</SelectItem>
                            <SelectItem value="VEHICLE_STATUS">Status de Veículo</SelectItem>
                            <SelectItem value="ITEM_IN">Entrada de Item</SelectItem>
                            <SelectItem value="ITEM_OUT">Saída de Item</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="ml-auto text-sm text-zinc-500">
                        {events.length} evento(s)
                    </span>
                </div>
            )}

            {/* Events List */}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {events.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                        Nenhum evento encontrado
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {events.map((event) => (
                            <EventRow key={event.id} event={event} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function EventRow({ event }: { event: OperiumEvent }) {
    const config = EVENT_CONFIG[event.type]
    const metadata = event.metadata as Record<string, unknown>

    // Extract display info based on type
    let detail = ""
    if (event.type === "VEHICLE_EXPENSE" && metadata.valor) {
        detail = `R$ ${Number(metadata.valor).toFixed(2)}`
    } else if (event.type === "ITEM_IN" || event.type === "ITEM_OUT") {
        if (metadata.quantidade) {
            detail = `${metadata.quantidade} un.`
        }
    } else if (event.type === "VEHICLE_STATUS" && metadata.status_novo) {
        detail = String(metadata.status_novo)
    }

    return (
        <div className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-start gap-3">
                {/* Icon Badge */}
                <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg",
                    config.bgColor
                )}>
                    <span className={config.color}>{config.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {config.label}
                        </span>
                        {detail && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {detail}
                            </span>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {(event.type === "VEHICLE_EXPENSE" || event.type === "VEHICLE_STATUS") && (
                            <span className="flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                {event.target_id.slice(0, 8)}...
                            </span>
                        )}
                        {(event.type === "ITEM_IN" || event.type === "ITEM_OUT") && (
                            <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {event.target_id.slice(0, 8)}...
                            </span>
                        )}
                    </div>

                    {/* Observations */}
                    {metadata.observacoes && (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {String(metadata.observacoes)}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
