import { createServerComponentClient } from "@/lib/supabase-server"
import { createServiceRoleClient } from "@/lib/supabase-admin" // Using Admin Client
import { checkBlackboxAccess } from "@/lib/security" // Using Security Guard
import { notFound } from "next/navigation"
import { AlertTriangle, Activity, Database, ShieldAlert, Award, Terminal, Users, TrendingUp } from "lucide-react"

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

    // Q5: Collaborator Trust (Top by responsibility_score)
    const { data: q5Data } = await supabaseAdmin.from('collaborator_behavior_features')
        .select(`
            collaborator_id,
            responsibility_score,
            process_adherence_score,
            colaboradores!inner(nome, cargo)
        `)
        .order('responsibility_score', { ascending: false })
        .limit(5)

    // Q6: Risk Exposure (High risk collaborators)
    const { data: q6Data } = await supabaseAdmin.from('collaborator_behavior_features')
        .select(`
            collaborator_id,
            risk_exposure_score,
            incident_rate,
            colaboradores!inner(nome, cargo)
        `)
        .order('risk_exposure_score', { ascending: false })
        .limit(5)

    // Q7: Behavior Aggregates (by segment/size)
    const { data: q7Data } = await supabaseAdmin.schema('analytics').from('collaborator_behavior_aggregates')
        .select('*')
        .order('sample_size', { ascending: false })
        .limit(5)

    // 5. Calculate Confidence
    const totalEvents = await supabaseAdmin.schema('events').from('stream').select('id', { count: 'exact', head: true })
    const confidenceLevel = (totalEvents.count || 0) > 1000 ? 'HIGH' : (totalEvents.count || 0) > 100 ? 'MEDIUM' : 'LOW'

    // 6. UI Render (Terminal Dark Mode)
    return (
        <div className="min-h-screen bg-[#171717] text-zinc-300 font-mono p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
                <div>
                    <h1 className="text-lg text-emerald-400 font-bold flex items-center gap-2">
                        <Terminal className="w-5 h-5" />
                        <span className="text-zinc-500">:::</span> BLACKBOX_CONSOLE <span className="text-zinc-600">{'// v1.2'}</span>
                    </h1>
                    <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">INTERNAL RELIABILITY ENGINEERING ACCESS ONLY</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded text-xs font-bold border ${confidenceLevel === 'HIGH' ? 'text-emerald-400 border-emerald-900 bg-emerald-950/50' :
                        confidenceLevel === 'MEDIUM' ? 'text-amber-400 border-amber-900 bg-amber-950/50' :
                            'text-rose-400 border-rose-900 bg-rose-950/50'
                        }`}>
                        DATA_CONFIDENCE: {confidenceLevel}
                    </div>
                    <span className="text-xs text-zinc-600">{totalEvents.count?.toLocaleString()} EVENTS</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Q1: IRON HORSES */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">::: IRON HORSES</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">Top Reliability</span>
                    </div>
                    <div className="p-4">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2 text-left">ASSET</th>
                                    <th className="py-2 text-right">USES</th>
                                    <th className="py-2 text-right">RATIO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q1Data?.map((item: any) => (
                                    <tr key={item.asset_name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-2 text-zinc-300">{item.asset_name}</td>
                                        <td className="py-2 text-right text-zinc-500">{item.uses}</td>
                                        <td className="py-2 text-right font-bold text-emerald-400">{item.reliability_ratio}</td>
                                    </tr>
                                ))}
                                {(!q1Data || q1Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center text-zinc-700 italic">No data yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Q2: LEMON DETECTOR */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">::: LEMON DETECTOR</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">Critical Assets</span>
                    </div>
                    <div className="p-4">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2 text-left">ASSET</th>
                                    <th className="py-2 text-right">SCORE</th>
                                    <th className="py-2 text-right">REPAIRS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q2Data?.map((item: any) => (
                                    <tr key={item.asset_name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-2 text-rose-300">{item.asset_name}</td>
                                        <td className="py-2 text-right font-bold text-rose-400">{item.health_score}</td>
                                        <td className="py-2 text-right text-zinc-500">{item.total_repairs}</td>
                                    </tr>
                                ))}
                                {(!q2Data || q2Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center text-zinc-700 italic">No critical assets (Good!)</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Q3: MAINTENANCE PULSE */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">::: MAINTENANCE PULSE</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">Bounce Rate</span>
                    </div>
                    <div className="p-6">
                        <div className="flex items-baseline gap-4">
                            <div className="text-5xl font-bold text-zinc-100">
                                {q3Data?.bounce_rate_percent || 0}<span className="text-2xl text-zinc-500">%</span>
                            </div>
                            <div className="text-xs text-zinc-500">
                                of repairs fail within 7 days
                                {(q3Data?.bounce_rate_percent || 0) > 15 ?
                                    <span className="text-rose-400 block mt-2 font-bold">⚠ CRITICAL: Review workshop quality</span> :
                                    <span className="text-emerald-400 block mt-2 font-bold">✓ HEALTHY: Standards met</span>
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* Q4: RAW EVENT STREAM */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">::: RAW_STREAM_TAIL</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">last_10</span>
                    </div>
                    <div className="p-4 max-h-[280px] overflow-y-auto">
                        <ul className="space-y-1">
                            {q4Data?.map((event: any, i: number) => (
                                <li key={i} className="text-[10px] flex gap-3 py-1 border-b border-zinc-800/30">
                                    <span className="text-zinc-600 min-w-[110px]">
                                        {new Date(event.occurred_at).toLocaleDateString()} {new Date(event.occurred_at).toLocaleTimeString()}
                                    </span>
                                    <span className="text-emerald-400 font-bold min-w-[140px]">{event.event_type}</span>
                                    <span className="text-zinc-500 truncate" title={JSON.stringify(event.payload)}>
                                        {JSON.stringify(event.payload)}
                                    </span>
                                </li>
                            ))}
                            {(!q4Data || q4Data.length === 0) && (
                                <li className="py-4 text-center text-zinc-700 italic text-xs">No events yet</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Q5: COLLABORATOR TRUST */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-500" />
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">::: COLLABORATOR TRUST</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">Top Responsibility</span>
                    </div>
                    <div className="p-4">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2 text-left">COLLABORATOR</th>
                                    <th className="py-2 text-right">RESP</th>
                                    <th className="py-2 text-right">ADHERENCE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q5Data?.map((item: any) => (
                                    <tr key={item.collaborator_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-2">
                                            <span className="text-zinc-300">{item.colaboradores?.nome}</span>
                                            <span className="text-zinc-600 text-[10px] ml-2">{item.colaboradores?.cargo}</span>
                                        </td>
                                        <td className="py-2 text-right font-bold text-cyan-400">{item.responsibility_score}</td>
                                        <td className="py-2 text-right text-zinc-500">{item.process_adherence_score}</td>
                                    </tr>
                                ))}
                                {(!q5Data || q5Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center text-zinc-700 italic">Run score calculation first</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Q6: RISK EXPOSURE */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-orange-500" />
                        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">::: RISK EXPOSURE</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">High Risk Actors</span>
                    </div>
                    <div className="p-4">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2 text-left">COLLABORATOR</th>
                                    <th className="py-2 text-right">RISK</th>
                                    <th className="py-2 text-right">INC_RATE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q6Data?.map((item: any) => (
                                    <tr key={item.collaborator_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-2">
                                            <span className="text-orange-300">{item.colaboradores?.nome}</span>
                                            <span className="text-zinc-600 text-[10px] ml-2">{item.colaboradores?.cargo}</span>
                                        </td>
                                        <td className="py-2 text-right font-bold text-orange-400">{item.risk_exposure_score}</td>
                                        <td className="py-2 text-right text-zinc-500">{(item.incident_rate * 100).toFixed(2)}%</td>
                                    </tr>
                                ))}
                                {(!q6Data || q6Data.length === 0) && (
                                    <tr><td colSpan={3} className="py-4 text-center text-zinc-700 italic">Run score calculation first</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Q7: BEHAVIOR AGGREGATES */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden md:col-span-2">
                    <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">::: BEHAVIOR AGGREGATES</span>
                        <span className="text-[10px] text-zinc-600 ml-auto">Benchmark by Segment</span>
                    </div>
                    <div className="p-4">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2 text-left">SEGMENT</th>
                                    <th className="py-2 text-left">SIZE</th>
                                    <th className="py-2 text-right">SAMPLE</th>
                                    <th className="py-2 text-right">AVG_RESP</th>
                                    <th className="py-2 text-right">AVG_RISK</th>
                                    <th className="py-2 text-right">P90_RESP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {q7Data?.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="py-2 text-violet-300">{item.industry_segment || '-'}</td>
                                        <td className="py-2 text-zinc-400">{item.company_size || '-'}</td>
                                        <td className="py-2 text-right text-zinc-500">{item.sample_size}</td>
                                        <td className="py-2 text-right font-bold text-emerald-400">{item.avg_responsibility}</td>
                                        <td className="py-2 text-right text-orange-400">{item.avg_risk}</td>
                                        <td className="py-2 text-right text-zinc-500">{item.p90_responsibility}</td>
                                    </tr>
                                ))}
                                {(!q7Data || q7Data.length === 0) && (
                                    <tr><td colSpan={6} className="py-4 text-center text-zinc-700 italic">Need 5+ collaborators per segment for anonymity</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-700">
                <span>OPERIUM BLACKBOX v1.1 // RELIABILITY ENGINEERING</span>
                <span>SESSION: {user?.email}</span>
            </div>
        </div>
    )
}
