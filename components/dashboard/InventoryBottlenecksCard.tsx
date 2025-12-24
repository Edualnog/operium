"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, TrendingUp, AlertCircle, ArrowRight, Package } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useTranslation } from "react-i18next"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { safeArray } from "@/lib/utils/safe-array"

interface BottleneckItem {
    id: string
    name: string
    metric: string
    value: string | number
    type: "high_breakage" | "zombie_inventory" | "stockout_risk" | "team_no_leader" | "team_overdue_equipment" | "vehicle_overdue_maintenance" | "vehicle_high_cost" | "vehicle_high_fuel" | "collaborator_high_loss" | "collaborator_high_damage" | "collaborator_high_withdrawals"
    trend?: "up" | "down" | "stable"
}

export function InventoryBottlenecksCard({ userId }: { userId: string }) {
    const { t } = useTranslation('common')
    const [items, setItems] = useState<BottleneckItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchBottlenecks() {
            if (!userId) return

            const supabase = createClientComponentClient()
            const bottlenecks: BottleneckItem[] = []

            try {
                // 1. ANÁLISE DE QUEBRAS (High Breakage)
                // 1. ANÁLISE DE QUEBRAS (High Breakage)
                // Usar dados da tabela 'ferramentas' (legacy) pois events_stream não está disponível no schema atual

                // FALLBACK: Query legacy 'movimentacoes' for repairs/breakage if events.stream is locked (likely is for client)
                // We will simulate the "Intelligence" by querying the legacy operational data that FEEDS the intelligence
                const { data: legacyBreakage } = await supabase
                    .from('ferramentas')
                    .select('id, nome, estado, quantidade_total')
                    .eq('profile_id', userId)  // CRITICAL: Filter by user!
                    .eq('estado', 'danificada')
                    .limit(5)

                legacyBreakage?.forEach(item => {
                    bottlenecks.push({
                        id: item.id,
                        name: item.nome,
                        metric: "Status",
                        value: "Danificada",
                        type: "high_breakage",
                        trend: "up"
                    })
                })

                // 2. ANÁLISE DE ESTOQUE ZUMBI (Sem movimento há 90 dias)
                const ninetyDaysAgo = new Date()
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

                // Find items with NO movements in the last 90 days
                // This is a heavy query, usually done by a backend job.
                // Simplified approach: Get top 5 items by stock quantity, check their last movement.
                const { data: topStock } = await supabase
                    .from('ferramentas')
                    .select('id, nome, quantidade_disponivel')
                    .eq('profile_id', userId)  // CRITICAL: Filter by user!
                    .gt('quantidade_disponivel', 0)
                    .order('quantidade_disponivel', { ascending: false })
                    .limit(10)

                if (topStock) {
                    for (const item of topStock) {
                        const { data: lastMove } = await supabase
                            .from('movimentacoes')
                            .select('data')
                            .eq('profile_id', userId)  // CRITICAL: Filter by user!
                            .eq('ferramenta_id', item.id)
                            .order('data', { ascending: false })
                            .limit(1)

                        if (!lastMove || !lastMove[0] || new Date(lastMove[0].data) < ninetyDaysAgo) {
                            bottlenecks.push({
                                id: item.id,
                                name: item.nome,
                                metric: "Estoque estagnado",
                                value: lastMove?.[0]?.data ? new Date(lastMove[0].data).toLocaleDateString('pt-BR') : 'Sem movimentação',
                                type: "zombie_inventory"
                            })
                        }
                    }
                }

                // 3. ANÁLISE DE EQUIPES - Equipes sem líder
                const { data: teamsWithoutLeader } = await supabase
                    .from('teams')
                    .select('id, name, status')
                    .eq('profile_id', userId)
                    .is('leader_id', null)
                    .eq('status', 'active')
                    .limit(3)

                teamsWithoutLeader?.forEach(team => {
                    bottlenecks.push({
                        id: team.id,
                        name: team.name,
                        metric: "Status",
                        value: "Sem líder",
                        type: "team_no_leader",
                        trend: "up"
                    })
                })

                // 4. ANÁLISE DE EQUIPES - Equipamentos não devolvidos há muito tempo
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

                const { data: allTeamEquipment } = await supabase
                    .from('team_equipment')
                    .select('id, assigned_at, team_id')
                    .is('returned_at', null)
                    .lt('assigned_at', thirtyDaysAgo.toISOString())
                    .limit(10)

                // Fetch team names separately
                if (allTeamEquipment && allTeamEquipment.length > 0) {
                    const teamIds = allTeamEquipment.map(eq => eq.team_id)
                    const { data: teams } = await supabase
                        .from('teams')
                        .select('id, name')
                        .eq('profile_id', userId)
                        .in('id', teamIds)

                    const teamsMap = new Map(teams?.map(t => [t.id, t.name]) || [])

                    allTeamEquipment.slice(0, 3).forEach(eq => {
                        const teamName = teamsMap.get(eq.team_id)
                        if (teamName) {
                            const daysOld = Math.floor((Date.now() - new Date(eq.assigned_at).getTime()) / (1000 * 60 * 60 * 24))
                            bottlenecks.push({
                                id: eq.id,
                                name: teamName,
                                metric: "Equipamento retido",
                                value: `${daysOld} dias`,
                                type: "team_overdue_equipment"
                            })
                        }
                    })
                }

                // 5. ANÁLISE DE VEÍCULOS - Manutenções atrasadas
                const { data: vehiclesData } = await supabase
                    .from('vehicles')
                    .select(`
                        id,
                        plate,
                        model,
                        vehicle_maintenances(next_maintenance_date)
                    `)
                    .eq('profile_id', userId)
                    .limit(10)

                const today = new Date()
                vehiclesData?.forEach(vehicle => {
                    const maintenances = vehicle.vehicle_maintenances || []
                    const nextMaintenance = maintenances
                        .map(m => new Date(m.next_maintenance_date))
                        .filter(d => !isNaN(d.getTime()))
                        .sort((a, b) => a.getTime() - b.getTime())[0]

                    if (nextMaintenance && nextMaintenance < today) {
                        const daysOverdue = Math.floor((today.getTime() - nextMaintenance.getTime()) / (1000 * 60 * 60 * 24))
                        bottlenecks.push({
                            id: vehicle.id,
                            name: `${vehicle.plate} - ${vehicle.model || 'Veículo'}`,
                            metric: "Manutenção atrasada",
                            value: `${daysOverdue} dias`,
                            type: "vehicle_overdue_maintenance",
                            trend: "up"
                        })
                    }
                })

                // 6. ANÁLISE DE VEÍCULOS - Custos elevados
                const { data: highCostVehicles } = await supabase
                    .from('vehicles')
                    .select(`
                        id,
                        plate,
                        model,
                        vehicle_costs(amount),
                        vehicle_maintenances(cost)
                    `)
                    .eq('profile_id', userId)
                    .limit(10)

                const vehiclesWithCosts = highCostVehicles?.map(v => {
                    const totalCosts = (
                        (v.vehicle_costs || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0) +
                        (v.vehicle_maintenances || []).reduce((sum, m) => sum + (Number(m.cost) || 0), 0)
                    )
                    return { ...v, totalCosts }
                }).sort((a, b) => b.totalCosts - a.totalCosts) || []

                if (vehiclesWithCosts.length > 0 && vehiclesWithCosts[0].totalCosts > 1000) {
                    vehiclesWithCosts.slice(0, 2).forEach(v => {
                        if (v.totalCosts > 1000) {
                            bottlenecks.push({
                                id: v.id,
                                name: `${v.plate} - ${v.model || 'Veículo'}`,
                                metric: "Custo total",
                                value: `R$ ${v.totalCosts.toFixed(2)}`,
                                type: "vehicle_high_cost",
                                trend: "up"
                            })
                        }
                    })
                }

                // 7. ANÁLISE DE COMBUSTÍVEL - Veículos com gasto excessivo
                const startOfMonth = new Date()
                startOfMonth.setDate(1)

                const { data: fuelCostsData } = await supabase
                    .from('vehicle_costs')
                    .select('vehicle_id, amount, vehicles!inner(plate, model, profile_id)')
                    .eq('vehicles.profile_id', userId)
                    .gte('reference_month', startOfMonth.toISOString())
                    .limit(50)

                const fuelCosts = safeArray(fuelCostsData).filter(c =>
                    c.cost_type?.toLowerCase().includes('fuel') ||
                    c.cost_type?.toLowerCase().includes('combustivel') ||
                    c.cost_type?.toLowerCase().includes('gasolina') ||
                    c.cost_type?.toLowerCase().includes('diesel ')
                )

                const vehicleFuelMap = new Map()
                fuelCosts.forEach(cost => {
                    if (!cost.vehicles) return
                    const current = vehicleFuelMap.get(cost.vehicle_id) || { total: 0, vehicle: cost.vehicles }
                    current.total += Number(cost.amount) || 0
                    vehicleFuelMap.set(cost.vehicle_id, current)
                })

                if (vehicleFuelMap.size > 0) {
                    const avgFuel = Array.from(vehicleFuelMap.values()).reduce((sum, v) => sum + v.total, 0) / vehicleFuelMap.size

                    vehicleFuelMap.forEach((data, id) => {
                        if (data.total > avgFuel * 1.3) { // 30% acima da média
                            bottlenecks.push({
                                id,
                                name: `${data.vehicle.plate} - ${data.vehicle.model || 'Veículo'}`,
                                metric: "Combustível",
                                value: `R$ ${data.total.toFixed(2)}`,
                                type: "vehicle_high_fuel",
                                trend: "up"
                            })
                        }
                    })
                }

                // 8. ANÁLISE DE PERDAS POR COLABORADOR
                // TODO: Reimplementar com lógica correta
                // PROBLEMA: Lógica atual não considera itens ainda em uso legítimo
                // Apenas conta retiradas - devoluções, o que não é uma "perda" real
                /*
                const thirtyDaysAgoForLoss = new Date()
                thirtyDaysAgoForLoss.setDate(thirtyDaysAgoForLoss.getDate() - 30)

                const { data: movements } = await supabase
                    .from('movimentacoes')
                    .select('colaborador_id, tipo, colaboradores!inner(nome, profile_id)')
                    .eq('colaboradores.profile_id', userId)
                    .gte('data', thirtyDaysAgoForLoss.toISOString())
                    .in('tipo', ['retirada', 'devolucao'])
                    .limit(500)

                const collabStats = new Map()
                safeArray(movements).forEach(m => {
                    if (!m.colaborador_id) return
                    const stats = collabStats.get(m.colaborador_id) || {
                        retiradas: 0,
                        devolucoes: 0,
                        nome: m.colaboradores?.nome
                    }
                    if (m.tipo === 'retirada') stats.retiradas++
                    if (m.tipo === 'devolucao') stats.devolucoes++
                    collabStats.set(m.colaborador_id, stats)
                })

                collabStats.forEach((stats, id) => {
                    if (stats.retiradas > 0) {
                        const lossRate = (stats.retiradas - stats.devolucoes) / stats.retiradas
                        if (lossRate > 0.2 && stats.retiradas >= 5) { // > 20% de perdas E pelo menos 5 retiradas
                            bottlenecks.push({
                                id,
                                name: stats.nome || 'Colaborador',
                                metric: "Taxa de perdas",
                                value: `${(lossRate * 100).toFixed(0)}%`,
                                type: "collaborator_high_loss",
                                trend: "up"
                            })
                        }
                    }
                })
                */

                // 9. COLABORADORES COM ALTO VOLUME DE RETIRADAS (Informativo)
                const thirtyDaysAgoWithdrawals = new Date()
                thirtyDaysAgoWithdrawals.setDate(thirtyDaysAgoWithdrawals.getDate() - 30)

                const { data: withdrawals } = await supabase
                    .from('movimentacoes')
                    .select('colaborador_id, quantidade, colaboradores!inner(nome, profile_id)')
                    .eq('colaboradores.profile_id', userId)
                    .eq('tipo', 'retirada')
                    .gte('data', thirtyDaysAgoWithdrawals.toISOString())
                    .limit(500)

                // Agrupar por colaborador
                const withdrawalsByCollab = new Map()
                safeArray(withdrawals).forEach(m => {
                    if (!m.colaborador_id) return
                    const current = withdrawalsByCollab.get(m.colaborador_id) || {
                        nome: m.colaboradores?.nome,
                        total: 0
                    }
                    current.total += (m.quantidade || 0)
                    withdrawalsByCollab.set(m.colaborador_id, current)
                })

                // Pegar top 2 com mais retiradas (se > 20 itens em 30 dias)
                const topWithdrawers = Array.from(withdrawalsByCollab.entries())
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 2)
                    .filter(([_, data]) => data.total > 20)

                topWithdrawers.forEach(([id, data]) => {
                    bottlenecks.push({
                        id,
                        name: data.nome || 'Colaborador',
                        metric: "Volume de retiradas",
                        value: `${data.total} itens`,
                        type: "collaborator_high_withdrawals",
                        trend: "up"
                    })
                })

                setItems(bottlenecks.slice(0, 8)) // Show top 8
            } catch (error) {
                console.error("Error fetching bottlenecks:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchBottlenecks()
    }, [userId])

    if (loading) {
        return <Skeleton className="w-full h-64" />
    }

    if (items.length === 0) {
        return (
            <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800 transition-all hover:shadow-md">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                    <CardTitle className="text-base sm:text-lg font-bold font-serif text-[#37352f] flex items-center gap-2 dark:text-zinc-50">
                        <AlertTriangle className="h-5 w-5 text-green-500" />
                        {t('dashboard.bottlenecks.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-6 text-center">
                    <p className="text-zinc-600 dark:text-zinc-300 font-medium">{t('dashboard.bottlenecks.empty_title')}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t('dashboard.bottlenecks.empty_desc')}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800 transition-all hover:shadow-md">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-base sm:text-lg font-bold font-serif text-[#37352f] flex items-center gap-2 dark:text-zinc-50">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        {t('dashboard.bottlenecks.title')}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-[#37352f]/60 mt-1 dark:text-zinc-400">
                        {t('dashboard.bottlenecks.desc')}
                    </p>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-3 group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 px-2 -mx-2 rounded-md transition-colors">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 p-1.5 rounded-full ${item.type === 'high_breakage' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                    item.type === 'zombie_inventory' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' :
                                        item.type === 'team_no_leader' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                                            item.type === 'team_overdue_equipment' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                item.type === 'vehicle_overdue_maintenance' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                    item.type === 'vehicle_high_cost' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                                                        item.type === 'vehicle_high_fuel' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                                                            item.type === 'collaborator_high_loss' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                                item.type === 'collaborator_high_damage' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                                    item.type === 'collaborator_high_withdrawals' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                                                        'bg-amber-100 text-amber-600'
                                    }`}>
                                    {item.type === 'high_breakage' ? <AlertCircle className="h-4 w-4" /> :
                                        item.type === 'zombie_inventory' ? <Package className="h-4 w-4" /> :
                                            item.type === 'team_no_leader' ? <AlertTriangle className="h-4 w-4" /> :
                                                item.type === 'team_overdue_equipment' ? <Clock className="h-4 w-4" /> :
                                                    item.type === 'vehicle_overdue_maintenance' ? <AlertCircle className="h-4 w-4" /> :
                                                        item.type === 'vehicle_high_cost' ? <TrendingUp className="h-4 w-4" /> :
                                                            item.type === 'vehicle_high_fuel' ? <AlertTriangle className="h-4 w-4" /> :
                                                                item.type === 'collaborator_high_loss' ? <AlertCircle className="h-4 w-4" /> :
                                                                    item.type === 'collaborator_high_damage' ? <AlertCircle className="h-4 w-4" /> :
                                                                        item.type === 'collaborator_high_withdrawals' ? <AlertCircle className="h-4 w-4" /> :
                                                                            <Clock className="h-4 w-4" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                                        {item.type === 'high_breakage' ? 'Alta taxa de defeito' :
                                            item.type === 'zombie_inventory' ? 'Estoque estagnado' :
                                                item.type === 'team_no_leader' ? 'Equipe sem liderança' :
                                                    item.type === 'team_overdue_equipment' ? 'Equipamento não devolvido' :
                                                        item.type === 'vehicle_overdue_maintenance' ? 'Manutenção vencida' :
                                                            item.type === 'vehicle_high_cost' ? 'Custo elevado' :
                                                                item.type === 'vehicle_high_fuel' ? 'Combustível excessivo' :
                                                                    item.type === 'collaborator_high_loss' ? 'Alta taxa de perdas' :
                                                                        item.type === 'collaborator_high_damage' ? 'Muitos danos causados' :
                                                                            item.type === 'collaborator_high_withdrawals' ? 'Alto volume de retiradas' :
                                                                                'Risco de ruptura'}
                                        {item.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xs text-zinc-400 mb-1">
                                    {item.metric}
                                </div>
                                <Badge variant={item.type === 'high_breakage' ? 'destructive' : 'secondary'} className="font-normal">
                                    {item.value}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
                    <Link href="/dashboard/estoque">
                        <Button variant="ghost" className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 w-full h-auto py-2">
                            Ver Relatório Completo de Anomalias <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
