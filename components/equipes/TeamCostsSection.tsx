"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Loader2, DollarSign, Fuel, Wrench, Car, Receipt } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface TeamCost {
    id: string
    cost_type: string
    amount: number
    date?: string
    notes?: string
    created_at: string
    vehicle?: {
        plate: string
        model: string
    }
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

export default function TeamCostsSection({ teamId }: TeamCostsSectionProps) {
    const supabase = createClientComponentClient()
    const [costs, setCosts] = useState<TeamCost[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)

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
                        reference_month,
                        notes,
                        created_at,
                        vehicles:vehicle_id (
                            plate,
                            model
                        )
                    `)
                    .eq("team_id", teamId)
                    .order("created_at", { ascending: false })
                    .limit(50)

                if (error) throw error

                const formattedCosts = (data || []).map(c => ({
                    ...c,
                    date: c.reference_month,
                    vehicle: c.vehicles as any
                }))

                setCosts(formattedCosts)
                setTotal(formattedCosts.reduce((sum, c) => sum + (c.amount || 0), 0))
            } catch (err) {
                console.error("Error fetching team costs:", err)
            } finally {
                setLoading(false)
            }
        }

        if (teamId) fetchCosts()
    }, [teamId, supabase])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Total Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-medium">
                            Total de Custos
                        </p>
                        <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Costs List */}
            {costs.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                    <Receipt className="h-12 w-12 mx-auto mb-3 text-zinc-300" />
                    <p className="font-medium">Nenhum custo registrado</p>
                    <p className="text-sm">Os custos desta equipe aparecerão aqui.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {costs.map((cost) => {
                        const Icon = COST_TYPE_ICONS[cost.cost_type] || Receipt
                        return (
                            <div
                                key={cost.id}
                                className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800"
                            >
                                <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {COST_TYPE_LABELS[cost.cost_type] || cost.cost_type}
                                    </p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                        {cost.vehicle?.plate && `${cost.vehicle.plate} • `}
                                        {format(new Date(cost.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    R$ {cost.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
