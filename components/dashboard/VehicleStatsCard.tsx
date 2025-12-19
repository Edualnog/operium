"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Car, Wrench, UserCheck, DollarSign } from "lucide-react"
import { useTranslation } from "react-i18next"
import { createClientComponentClient } from "@/lib/supabase-client"
import { startOfMonth, endOfMonth } from "date-fns"

interface VehicleStatsData {
    total: number
    assigned: number
    maintenance: number
    monthlyCost: number
}

export function VehicleStats() {
    const { t } = useTranslation('common')
    const [stats, setStats] = useState<VehicleStatsData>({
        total: 0,
        assigned: 0,
        maintenance: 0,
        monthlyCost: 0
    })
    const [loading, setLoading] = useState(true)

    const supabase = createClientComponentClient()

    useEffect(() => {
        async function fetchStats() {
            try {
                // 1. Fetch Vehicles Status
                const { data: vehicles, error: vError } = await supabase
                    .from('vehicles')
                    .select('id, status, current_driver_id')

                if (vError) throw vError

                // 2. Fetch Monthly Costs (Maintenance + Fuel/Other Costs)
                const now = new Date()
                const start = startOfMonth(now).toISOString()
                const end = endOfMonth(now).toISOString()

                // Maintenance Costs
                const { data: maintenanceData, error: mError } = await supabase
                    .from('vehicle_maintenances')
                    .select('cost')
                    .gte('maintenance_date', start)
                    .lte('maintenance_date', end)

                if (mError) throw mError

                // Other Costs
                const { data: costsData, error: cError } = await supabase
                    .from('vehicle_costs')
                    .select('amount')
                    .gte('reference_month', start)
                    .lte('reference_month', end)

                if (cError) throw cError

                // Aggregate
                const total = vehicles?.length || 0
                const assigned = vehicles?.filter(v => !!v.current_driver_id).length || 0
                const maintenance = vehicles?.filter(v => v.status === 'maintenance').length || 0

                const totalMaintCost = maintenanceData?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0
                const totalOtherCost = costsData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0

                setStats({
                    total,
                    assigned,
                    maintenance,
                    monthlyCost: totalMaintCost + totalOtherCost
                })

            } catch (error) {
                console.error("Error fetching vehicle stats:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [supabase])

    const formattedCost = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
    }).format(stats.monthlyCost)

    if (loading) {
        return (
            <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Car className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {t('dashboard.vehicles.title')}
                    </h2>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse dark:bg-zinc-800" />
                    ))}
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Car className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {t('dashboard.vehicles.title')}
                </h2>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Car className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('dashboard.vehicles.total')}</p>
                                <p className="text-xl font-bold text-[#37352f] dark:text-zinc-50">
                                    {stats.total}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <UserCheck className="h-5 w-5 text-blue-400 dark:text-blue-500" />
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('dashboard.vehicles.assigned')}</p>
                                <p className="text-xl font-bold text-[#37352f] dark:text-zinc-50">
                                    {stats.assigned}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Wrench className="h-5 w-5 text-orange-400 dark:text-orange-500" />
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('dashboard.vehicles.maintenance')}</p>
                                <p className="text-xl font-bold text-[#37352f] dark:text-zinc-50">
                                    {stats.maintenance}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-green-400 dark:text-green-500" />
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('dashboard.vehicles.cost_month')}</p>
                                <p className="text-xl font-bold text-[#37352f] dark:text-zinc-50">
                                    {formattedCost}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
