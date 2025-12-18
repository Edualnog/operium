"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, BarChart3, AlertCircle } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"

interface OrgMemory {
    profile_id: string
    total_history_events: number
    accumulated_divergence_count: number
    operational_maturity_stage: "NOVICE" | "DEVELOPING" | "OPTIMIZED"
}

export function OrgMaturityCard() {
    const [memory, setMemory] = useState<OrgMemory | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        async function fetchMemory() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data, error } = await supabase
                    .schema('analytics')
                    .from('memory_organization')
                    .select('*')
                    .eq('profile_id', user.id)
                    .single()

                if (error) {
                    console.error("Error fetching org memory:", error)
                } else {
                    setMemory(data)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        fetchMemory()
    }, [supabase])

    if (loading || !memory) return null

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'OPTIMIZED': return 'text-green-600'
            case 'DEVELOPING': return 'text-blue-600'
            case 'NOVICE': return 'text-orange-600'
            default: return 'text-gray-600'
        }
    }

    const getStageLabel = (stage: string) => {
        switch (stage) {
            case 'OPTIMIZED': return 'Otimizada'
            case 'DEVELOPING': return 'Em Desenvolvimento'
            case 'NOVICE': return 'Inicial'
            default: return stage
        }
    }

    // Calculate generic efficiency score (inverse of divergence ratio)
    // If 0 events, 0 score. If 100 events and 1 div, high score.
    const divergenceRatio = memory.total_history_events > 0
        ? (memory.accumulated_divergence_count / memory.total_history_events)
        : 0

    // Score: 100 - (ratio * 1000). E.g. 1% divergence = 100 - 10 = 90. 5% = 50.
    const efficiencyScore = Math.max(0, Math.min(100, 100 - (divergenceRatio * 500)))

    return (
        <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Maturidade Operacional
                </CardTitle>
                <div className={`text-2xl font-bold ${getStageColor(memory.operational_maturity_stage)}`}>
                    {getStageLabel(memory.operational_maturity_stage)}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">

                <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Score de Eficiência</span>
                        <span className="font-mono font-bold">{efficiencyScore.toFixed(0)}/100</span>
                    </div>
                    <Progress value={efficiencyScore} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <span className="text-xs text-muted-foreground block">Histórico</span>
                        <span className="text-lg font-semibold flex items-center gap-1">
                            {memory.total_history_events}
                            <span className="text-[10px] text-muted-foreground">eventos</span>
                        </span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">Divergências</span>
                        <span className="text-lg font-semibold text-red-600 flex items-center gap-1">
                            {memory.accumulated_divergence_count}
                            <AlertCircle className="w-3 h-3 text-red-400" />
                        </span>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
