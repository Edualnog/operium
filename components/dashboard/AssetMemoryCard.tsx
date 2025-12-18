"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, Activity, DollarSign, Clock } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"

interface AssetMemory {
    ferramenta_id: string
    asset_name: string
    health_status: "GOOD" | "WARNING" | "CRITICAL"
    total_repair_cost: number
    usage_cycles: number
    avg_hours_per_cycle: number
    value_efficiency_score: number
}

export function AssetMemoryCard({ ferramentaId }: { ferramentaId: string }) {
    const [memory, setMemory] = useState<AssetMemory | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        async function fetchMemory() {
            if (!ferramentaId) return

            try {
                // Direct query to the view. 
                // Note: Supabase JS client usually queries 'public' schema by default.
                // We might need to specify schema if possible, or reliance on direct query if RLS/Grants allow.
                // If the view is in 'analytics' schema, we typically need to call .schema('analytics') or use an RPC if schema selection isn't enabled in client.
                // Let's try explicit schema selection.
                const { data, error } = await supabase
                    .schema('analytics')
                    .from('memory_assets')
                    .select('*')
                    .eq('ferramenta_id', ferramentaId)
                    .single()

                if (error) {
                    console.error("Error fetching asset memory:", error)
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
    }, [ferramentaId, supabase])

    if (loading) return <div className="animate-pulse h-24 bg-muted rounded-md" />
    if (!memory) return null // Hide if no data (e.g. new asset)

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'GOOD': return 'text-green-500'
            case 'WARNING': return 'text-yellow-500'
            case 'CRITICAL': return 'text-red-500'
            default: return 'text-gray-500'
        }
    }

    const getHealthIcon = (status: string) => {
        switch (status) {
            case 'GOOD': return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'WARNING': return <AlertTriangle className="w-5 h-5 text-yellow-500" />
            case 'CRITICAL': return <Activity className="w-5 h-5 text-red-500" />
            default: return <Activity className="w-5 h-5 text-gray-500" />
        }
    }

    return (
        <Card className="border-l-4 border-l-blue-500 shadow-sm mt-4">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Memória do Ativo
                    </CardTitle>
                    {getHealthIcon(memory.health_status)}
                </div>
                <CardDescription className="text-xs">
                    Comportamento histórico e saúde
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">

                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Ciclos de Uso</span>
                    <div className="flex items-center gap-2 font-semibold">
                        <Activity className="w-3 h-3" />
                        {memory.usage_cycles} usos
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Eficiência (ROI)</span>
                    <div className="flex items-center gap-2">
                        <Progress value={Math.min(memory.value_efficiency_score, 100)} className="h-2 w-16" />
                        <span className="font-mono text-xs">{memory.value_efficiency_score}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Custo de Manutenção</span>
                    <div className="flex items-center gap-2 font-semibold text-red-600">
                        <DollarSign className="w-3 h-3" />
                        R$ {memory.total_repair_cost || 0}
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Média Tempo/Uso</span>
                    <div className="flex items-center gap-2 font-semibold">
                        <Clock className="w-3 h-3" />
                        {memory.avg_hours_per_cycle}h
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
