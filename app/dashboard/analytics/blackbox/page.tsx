import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Activity, Database, ShieldAlert, Award } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function BlackboxConsole() {
    const supabase = await createServerComponentClient()

    // 1. Security Check (Hardcoded for "Founder" Access)
    // In a real app, this would be a proper RBAC, but for now it's a "Secret Room"
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    // Replace with your actual admin email if you want strict enforcement
    // const ADMIN_EMAIL = "erisson.eduardo@gmail.com" 
    // if (user.email !== ADMIN_EMAIL) redirect("/dashboard")

    // 2. Fetch Quadrant Data
    const { data: ironHorses } = await supabase.from("analytics.rank_iron_horses").select("*").limit(5)
    // Note: Using raw string for table name because Types might not be updated yet
    // If this fails, we might need to use .from("rank_iron_horses") depending on how Supabase exposes views
    // Trying qualified name first:

    // Q1: Iron Horses
    const { data: q1Data } = await supabase.schema('analytics').from('rank_iron_horses').select('*').limit(5)

    // Q2: Lemons (Health < 50)
    const { data: q2Data } = await supabase.schema('analytics').from('dim_asset_health_card')
        .select('*')
        .lt('health_score', 50)
        .order('health_score', { ascending: true })
        .limit(5)

    // Q3: Bounce Rate (Raw fetch from view)
    const { data: q3Data } = await supabase.schema('analytics').from('kpi_maintenance_bounce_rate').select('*').single()

    // Q4: Raw Stream
    const { data: q4Data } = await supabase.schema('events').from('stream')
        .select('event_type, occurred_at, payload')
        .order('occurred_at', { ascending: false })
        .limit(10)

    // 3. Calculate Confidence
    const totalEvents = await supabase.schema('events').from('stream').select('id', { count: 'exact', head: true })
    const confidenceLevel = (totalEvents.count || 0) > 1000 ? 'HIGH' : (totalEvents.count || 0) > 100 ? 'MEDIUM' : 'LOW'

    return (
        <div className="p-6 bg-zinc-950 min-h-screen text-zinc-400 font-mono">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-zinc-900 pb-4">
                <div>
                    <h1 className="text-xl text-zinc-100 font-bold flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-500" />
                        BLACKBOX_CONSOLE // v1.0
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">INTERNAL RELIABILITY ENGINEERING ACCESS ONLY</p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className={
                        confidenceLevel === 'HIGH' ? 'text-green-500 border-green-900' :
                            confidenceLevel === 'MEDIUM' ? 'text-yellow-500 border-yellow-900' :
                                'text-red-500 border-red-900'
                    }>
                        DATA_CONFIDENCE: {confidenceLevel}
                    </Badge>
                    <span className="text-xs">{totalEvents.count} EVENTS</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Q1: IRON HORSES */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            IRON HORSES (Top Reliability)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2">ASSET</th>
                                    <th className="py-2 text-right">USES</th>
                                    <th className="py-2 text-right">RATIO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q1Data?.map((item: any) => (
                                    <tr key={item.asset_name} className="border-b border-zinc-800/50">
                                        <td className="py-2 text-zinc-300">{item.asset_name}</td>
                                        <td className="py-2 text-right">{item.uses}</td>
                                        <td className="py-2 text-right font-bold text-emerald-500">{item.reliability_ratio}</td>
                                    </tr>
                                ))}
                                {(!q1Data || q1Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center italic opacity-50">No data yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Q2: LEMON DETECTOR */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-rose-400 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            LEMON DETECTOR (Critical Assets)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2">ASSET</th>
                                    <th className="py-2 text-right">SCORE</th>
                                    <th className="py-2 text-right">REPAIRS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q2Data?.map((item: any) => (
                                    <tr key={item.asset_name} className="border-b border-zinc-800/50">
                                        <td className="py-2 text-rose-300">{item.asset_name}</td>
                                        <td className="py-2 text-right font-bold text-rose-500">{item.health_score}</td>
                                        <td className="py-2 text-right">{item.total_repairs}</td>
                                    </tr>
                                ))}
                                {(!q2Data || q2Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center italic opacity-50">No critical assets found (Good!)</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Q3: MAINTENANCE PULSE */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            MAINTENANCE PULSE (Bounce Rate)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-baseline gap-4 mt-2">
                        <div className="text-4xl font-bold text-zinc-200">
                            {q3Data?.bounce_rate_percent || 0}%
                        </div>
                        <div className="text-xs text-zinc-500 max-w-[200px]">
                            of repairs fail within 7 days.
                            {(q3Data?.bounce_rate_percent || 0) > 15 ?
                                <span className="text-rose-500 block mt-1">CRITICAL: Review workshop quality.</span> :
                                <span className="text-emerald-500 block mt-1">HEALTHY: Standards met.</span>
                            }
                        </div>
                    </CardContent>
                </Card>

                {/* Q4: RAW EVENT STREAM */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-400 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            RAW_STREAM_TAIL // last_10
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {q4Data?.map((event: any, i: number) => (
                                <li key={i} className="text-[10px] font-mono flex gap-2 border-b border-zinc-800/30 pb-1">
                                    <span className="text-zinc-600 min-w-[120px]">
                                        {new Date(event.occurred_at).toLocaleDateString()} {new Date(event.occurred_at).toLocaleTimeString()}
                                    </span>
                                    <span className="text-blue-400 font-bold min-w-[150px]">{event.event_type}</span>
                                    <span className="text-zinc-500 truncate max-w-[200px]" title={JSON.stringify(event.payload)}>
                                        {JSON.stringify(event.payload)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
