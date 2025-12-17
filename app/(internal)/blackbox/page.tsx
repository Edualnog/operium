import { createServerComponentClient } from "@/lib/supabase-server"
import { createServiceRoleClient } from "@/lib/supabase-admin" // Using Admin Client
import { checkBlackboxAccess } from "@/lib/security" // Using Security Guard
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Activity, Database, ShieldAlert, Award } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function BlackboxConsole() {
    // 1. Auth Check (Standard Client to verify identity)
    const supabaseAuth = await createServerComponentClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    // 2. Security Guard
    const access = checkBlackboxAccess(user)

    if (!access.allowed) {
        // Log access attempt if needed
        console.warn(`[Security] Blocked access to Blackbox: ${access.reason} (User: ${user?.email})`)
        return notFound() // 404 to obscure existence
    }

    // 3. Admin Data Fetch (Service Role Client to bypass schema lock)
    const supabaseAdmin = createServiceRoleClient()

    // 4. Fetch Quadrant Data (Using Admin Client on Locked Schema)
    // Q1: Iron Horses
    const { data: q1Data } = await supabaseAdmin.schema('analytics').from('rank_iron_horses').select('*').limit(5)

    // Q2: Lemons (Health < 50)
    const { data: q2Data } = await supabaseAdmin.schema('analytics').from('dim_asset_health_card')
        .select('*')
        .lt('health_score', 50)
        .order('health_score', { ascending: true })
        .limit(5)

    // Q3: Bounce Rate (Raw fetch from view)
    const { data: q3Data } = await supabaseAdmin.schema('analytics').from('kpi_maintenance_bounce_rate').select('*').single()

    // Q4: Raw Stream
    const { data: q4Data } = await supabaseAdmin.schema('events').from('stream')
        .select('event_type, occurred_at, payload')
        .order('occurred_at', { ascending: false })
        .limit(10)

    // 5. Calculate Confidence
    const totalEvents = await supabaseAdmin.schema('events').from('stream').select('id', { count: 'exact', head: true })
    const confidenceLevel = (totalEvents.count || 0) > 1000 ? 'HIGH' : (totalEvents.count || 0) > 100 ? 'MEDIUM' : 'LOW'

    // 6. UI Render (Light Mode)
    return (
        <div className="p-6 bg-white min-h-screen text-zinc-600 font-mono">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-zinc-200 pb-4">
                <div>
                    <h1 className="text-xl text-zinc-900 font-bold flex items-center gap-2">
                        <Database className="w-5 h-5 text-indigo-600" />
                        BLACKBOX_CONSOLE // v1.1 [SECURE]
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">INTERNAL RELIABILITY ENGINEERING ACCESS ONLY</p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className={
                        confidenceLevel === 'HIGH' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                            confidenceLevel === 'MEDIUM' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                'text-rose-600 border-rose-200 bg-rose-50'
                    }>
                        DATA_CONFIDENCE: {confidenceLevel}
                    </Badge>
                    <span className="text-xs text-zinc-500">{totalEvents.count} EVENTS</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Q1: IRON HORSES */}
                <Card className="bg-zinc-50 border-zinc-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-600" />
                            IRON HORSES (Top Reliability)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="text-zinc-500 border-b border-zinc-200">
                                    <th className="py-2">ASSET</th>
                                    <th className="py-2 text-right">USES</th>
                                    <th className="py-2 text-right">RATIO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q1Data?.map((item: any) => (
                                    <tr key={item.asset_name} className="border-b border-zinc-200/50 hover:bg-zinc-100/50">
                                        <td className="py-2 text-zinc-700 font-medium">{item.asset_name}</td>
                                        <td className="py-2 text-right text-zinc-600">{item.uses}</td>
                                        <td className="py-2 text-right font-bold text-emerald-600">{item.reliability_ratio}</td>
                                    </tr>
                                ))}
                                {(!q1Data || q1Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center italic opacity-40 text-zinc-400">No data yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Q2: LEMON DETECTOR */}
                <Card className="bg-zinc-50 border-zinc-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-rose-700 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            LEMON DETECTOR (Critical Assets)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="text-zinc-500 border-b border-zinc-200">
                                    <th className="py-2">ASSET</th>
                                    <th className="py-2 text-right">SCORE</th>
                                    <th className="py-2 text-right">REPAIRS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q2Data?.map((item: any) => (
                                    <tr key={item.asset_name} className="border-b border-zinc-200/50 hover:bg-zinc-100/50">
                                        <td className="py-2 text-rose-700 font-medium">{item.asset_name}</td>
                                        <td className="py-2 text-right font-bold text-rose-600">{item.health_score}</td>
                                        <td className="py-2 text-right text-zinc-600">{item.total_repairs}</td>
                                    </tr>
                                ))}
                                {(!q2Data || q2Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center italic opacity-40 text-zinc-400">No critical assets found (Good!)</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Q3: MAINTENANCE PULSE */}
                <Card className="bg-zinc-50 border-zinc-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            MAINTENANCE PULSE (Bounce Rate)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-baseline gap-4 mt-2">
                        <div className="text-4xl font-bold text-zinc-800">
                            {q3Data?.bounce_rate_percent || 0}%
                        </div>
                        <div className="text-xs text-zinc-500 max-w-[200px]">
                            of repairs fail within 7 days.
                            {(q3Data?.bounce_rate_percent || 0) > 15 ?
                                <span className="text-rose-600 block mt-1 font-semibold">CRITICAL: Review workshop quality.</span> :
                                <span className="text-emerald-600 block mt-1 font-semibold">HEALTHY: Standards met.</span>
                            }
                        </div>
                    </CardContent>
                </Card>

                {/* Q4: RAW EVENT STREAM */}
                <Card className="bg-zinc-50 border-zinc-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-600" />
                            RAW_STREAM_TAIL // last_10
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {q4Data?.map((event: any, i: number) => (
                                <li key={i} className="text-[10px] font-mono flex gap-2 border-b border-zinc-200 pb-1">
                                    <span className="text-zinc-500 min-w-[120px]">
                                        {new Date(event.occurred_at).toLocaleDateString()} {new Date(event.occurred_at).toLocaleTimeString()}
                                    </span>
                                    <span className="text-indigo-600 font-bold min-w-[150px]">{event.event_type}</span>
                                    <span className="text-zinc-600 truncate max-w-[200px]" title={JSON.stringify(event.payload)}>
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
