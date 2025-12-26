"use client"

import { useEffect, useState, useMemo } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Loader2, DollarSign, Fuel, Wrench, Car, Receipt, Filter, X, Calendar, User, ChevronDown } from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"

interface TeamCost {
    id: string
    cost_type: string
    amount: number
    notes?: string
    created_at: string
    registeredBy?: string
    vehiclePlate?: string
}

interface TeamCostsSectionProps {
    teamId: string
}

const COST_TYPE_ICONS: Record<string, any> = {
    combustivel: Fuel,
    manutencao: Wrench,
    pedagio: Car,
    estacionamento: Car,
    outros: Receipt
}

const COST_TYPE_LABELS: Record<string, string> = {
    combustivel: "Combustível",
    manutencao: "Manutenção",
    pedagio: "Pedágio",
    estacionamento: "Estacionamento",
    outros: "Outros"
}

const PERIOD_OPTIONS = [
    { value: "all", label: "Todos" },
    { value: "this_month", label: "Este mês" },
    { value: "last_month", label: "Mês passado" },
    { value: "last_3_months", label: "Últimos 3 meses" },
]

export default function TeamCostsSection({ teamId }: TeamCostsSectionProps) {
    const supabase = createClientComponentClient()
    const [costs, setCosts] = useState<TeamCost[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [periodFilter, setPeriodFilter] = useState("all")
    const [typeFilter, setTypeFilter] = useState("all")
    const [collaboratorFilter, setCollaboratorFilter] = useState("all")
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        const fetchCosts = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from("vehicle_costs")
                    .select(`
                        id,
                        cost_type,
                        amount,
                        notes,
                        created_at,
                        registered_by_name,
                        vehicles:vehicle_id (
                            plate
                        )
                    `)
                    .eq("team_id", teamId)
                    .order("created_at", { ascending: false })
                    .limit(100)

                if (error) throw error

                const formattedCosts = (data || []).map(c => ({
                    id: c.id,
                    cost_type: c.cost_type,
                    amount: c.amount || 0,
                    notes: c.notes,
                    created_at: c.created_at,
                    registeredBy: c.registered_by_name || "—",
                    vehiclePlate: (c.vehicles as any)?.plate || "—"
                }))

                setCosts(formattedCosts)
            } catch (err) {
                console.error("Error fetching team costs:", err)
            } finally {
                setLoading(false)
            }
        }

        if (teamId) fetchCosts()
    }, [teamId, supabase])

    // Get unique collaborators for filter
    const collaborators = useMemo(() => {
        const unique = [...new Set(costs.map(c => c.registeredBy).filter(Boolean))]
        return unique
    }, [costs])

    // Get unique types for filter
    const types = useMemo(() => {
        const unique = [...new Set(costs.map(c => c.cost_type))]
        return unique
    }, [costs])

    // Apply filters
    const filteredCosts = useMemo(() => {
        let filtered = [...costs]

        // Period filter
        if (periodFilter !== "all") {
            const now = new Date()
            let startDate: Date
            let endDate: Date = now

            switch (periodFilter) {
                case "this_month":
                    startDate = startOfMonth(now)
                    break
                case "last_month":
                    startDate = startOfMonth(subMonths(now, 1))
                    endDate = endOfMonth(subMonths(now, 1))
                    break
                case "last_3_months":
                    startDate = startOfMonth(subMonths(now, 2))
                    break
                default:
                    startDate = new Date(0)
            }

            filtered = filtered.filter(c => {
                const date = new Date(c.created_at)
                return date >= startDate && date <= endDate
            })
        }

        // Type filter
        if (typeFilter !== "all") {
            filtered = filtered.filter(c => c.cost_type === typeFilter)
        }

        // Collaborator filter
        if (collaboratorFilter !== "all") {
            filtered = filtered.filter(c => c.registeredBy === collaboratorFilter)
        }

        return filtered
    }, [costs, periodFilter, typeFilter, collaboratorFilter])

    // Calculate total
    const total = useMemo(() => {
        return filteredCosts.reduce((sum, c) => sum + (c.amount || 0), 0)
    }, [filteredCosts])

    const activeFiltersCount = [periodFilter, typeFilter, collaboratorFilter].filter(f => f !== "all").length

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header with Total and Filters */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Total Card - Compact */}
                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg px-4 py-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Total</p>
                        <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Filter Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                        ${showFilters || activeFiltersCount > 0
                            ? 'bg-[#37352f] text-white border-[#37352f]'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                        }`}
                >
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Filtros</span>
                    {activeFiltersCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-white text-[#37352f] text-xs flex items-center justify-center font-semibold">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtrar por</span>
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={() => {
                                    setPeriodFilter("all")
                                    setTypeFilter("all")
                                    setCollaboratorFilter("all")
                                }}
                                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
                            >
                                <X className="h-3 w-3" />
                                Limpar filtros
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Period */}
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Período
                            </label>
                            <select
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#37352f]/20"
                            >
                                {PERIOD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                                <Receipt className="h-3 w-3" /> Tipo
                            </label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#37352f]/20"
                            >
                                <option value="all">Todos</option>
                                {types.map(type => (
                                    <option key={type} value={type}>{COST_TYPE_LABELS[type] || type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Collaborator */}
                        <div>
                            <label className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                                <User className="h-3 w-3" /> Colaborador
                            </label>
                            <select
                                value={collaboratorFilter}
                                onChange={(e) => setCollaboratorFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#37352f]/20"
                            >
                                <option value="all">Todos</option>
                                {collaborators.map(collab => (
                                    <option key={collab} value={collab}>{collab}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            {filteredCosts.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
                    <p className="font-medium">Nenhum custo encontrado</p>
                    <p className="text-sm">
                        {activeFiltersCount > 0 ? "Tente ajustar os filtros." : "Os custos registrados aparecerão aqui."}
                    </p>
                </div>
            ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        <div className="col-span-3">Data</div>
                        <div className="col-span-2">Tipo</div>
                        <div className="col-span-2">Veículo</div>
                        <div className="col-span-3">Registrado por</div>
                        <div className="col-span-2 text-right">Valor</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredCosts.map((cost) => {
                            const Icon = COST_TYPE_ICONS[cost.cost_type] || Receipt
                            return (
                                <div
                                    key={cost.id}
                                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
                                >
                                    {/* Date */}
                                    <div className="col-span-3 text-sm text-zinc-900 dark:text-zinc-100">
                                        {format(new Date(cost.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                        <span className="text-zinc-400 text-xs ml-1">
                                            {format(new Date(cost.created_at), "HH:mm")}
                                        </span>
                                    </div>

                                    {/* Type */}
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <Icon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                                        </div>
                                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                            {COST_TYPE_LABELS[cost.cost_type] || cost.cost_type}
                                        </span>
                                    </div>

                                    {/* Vehicle */}
                                    <div className="col-span-2 text-sm text-zinc-600 dark:text-zinc-400">
                                        {cost.vehiclePlate}
                                    </div>

                                    {/* Registered By */}
                                    <div className="col-span-3">
                                        <span className="inline-flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                                            <User className="h-3.5 w-3.5 text-zinc-400" />
                                            {cost.registeredBy}
                                        </span>
                                    </div>

                                    {/* Amount */}
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Table Footer */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="col-span-10 text-sm text-zinc-500">
                            {filteredCosts.length} registro{filteredCosts.length !== 1 ? 's' : ''}
                        </div>
                        <div className="col-span-2 text-right text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
