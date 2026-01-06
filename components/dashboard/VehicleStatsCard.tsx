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
                // Get current user for profile_id filter
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // 1. Fetch Vehicles Status - filtered by profile_id
                const { data: vehicles, error: vError } = await supabase
                    .from('vehicles')
                    .select('id, status, current_driver_id')
                    .eq('profile_id', user.id)  // Security: Filter by user

                if (vError) throw vError

                // 2. Fetch Monthly Costs (Maintenance + Fuel/Other Costs)
                const now = new Date()
                const start = startOfMonth(now).toISOString()
                const end = endOfMonth(now).toISOString()

                // Get vehicle IDs for this user
                const vehicleIds = vehicles?.map(v => v.id) || []

                // Maintenance Costs - filtered by user's vehicles
                const { data: maintenanceData, error: mError } = await supabase
                    .from('vehicle_maintenances')
                    .select('cost')
                    .in('vehicle_id', vehicleIds.length > 0 ? vehicleIds : ['00000000-0000-0000-0000-000000000000'])
                    .gte('maintenance_date', start)
                    .lte('maintenance_date', end)

                if (mError) throw mError

                // Other Costs - filtered by user's vehicles
                const { data: costsData, error: cError } = await supabase
                    .from('vehicle_costs')
                    .select('amount')
                    .in('vehicle_id', vehicleIds.length > 0 ? vehicleIds : ['00000000-0000-0000-0000-000000000000'])
                    .gte('reference_month', start)
                    .lte('reference_month', end)

                if (cError) throw cError

                // 3. Count vehicles assigned to teams
                const { data: teamsData, error: tError } = await supabase
                    .from('teams')
                    .select('vehicle_id')
                    .eq('profile_id', user.id)
                    .not('vehicle_id', 'is', null)

                if (tError) throw tError

                // Aggregate
                const total = vehicles?.length || 0

                // Count assigned vehicles:
                // 1. Vehicles assigned to teams (via teams.vehicle_id)
                // 2. Vehicles assigned directly to collaborators (via vehicles.current_driver_id)
                // Use Set to avoid double-counting if a vehicle is in both
                const assignedVehicleIds = new Set([
                    ...(teamsData?.map(t => t.vehicle_id) || []),
                    ...(vehicles?.filter(v => !!v.current_driver_id).map(v => v.id) || [])
                ])
                const assigned = assignedVehicleIds.size

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
                        {t('vehicles.title')}
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
                    {t('vehicles.title')}
                </h2>
            </div>

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <Card className="border border-slate-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Car className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                            <div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('vehicles.total')}</p>
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
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('vehicles.assigned')}</p>
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
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('vehicles.maintenance.title')}</p>
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
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('vehicles.cost_month')}</p>
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
