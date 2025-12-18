"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, ShieldAlert, Clock, Zap } from "lucide-react"
import { createClientComponentClient } from "@/lib/supabase-client"

interface CollaboratorMemory {
    colaborador_id: string
    trust_level: "HIGH_TRUST" | "MEDIUM_TRUST" | "LOW_TRUST" | "UNKNOWN"
    reliability_score: number
    avg_possession_hours: number
    weekly_intensity: number
}

export function CollaboratorTrustCard({ colaboradorId }: { colaboradorId: string }) {
    const [memory, setMemory] = useState<CollaboratorMemory | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        async function fetchMemory() {
            if (!colaboradorId) return

            try {
                const { data, error } = await supabase
                    .schema('analytics')
                    .from('memory_collaborators')
                    .select('*')
                    .eq('colaborador_id', colaboradorId)
                    .single()

                if (error && error.code !== 'PGRST116') { // Ignore 'Result contains 0 rows'
                    console.error("Error fetching collaborator memory:", error)
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
    }, [colaboradorId, supabase])

    if (loading) return null
    if (!memory) return null // No sufficient history

    const getTrustBadge = (level: string) => {
        switch (level) {
            case 'HIGH_TRUST':
                return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Alta Confiança</Badge>
            case 'MEDIUM_TRUST':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Normal</Badge>
            case 'LOW_TRUST':
                return <Badge variant="destructive">Observação</Badge>
            default:
                return <Badge variant="outline">Novo</Badge>
        }
    }

    return (
        <Card className="border-t-4 border-t-purple-500 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        Perfil Comportamental
                    </CardTitle>
                    {getTrustBadge(memory.trust_level)}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">

                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Confiabilidade (Devoluções em dia)</span>
                        <span className="font-medium">{(memory.reliability_score * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={memory.reliability_score * 100} className="h-1.5" />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-50 p-2 rounded border flex flex-col items-center justify-center text-center">
                        <Clock className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-xs text-muted-foreground">Tempo Médio</span>
                        <span className="font-semibold text-slate-700">{Math.round(memory.avg_possession_hours)}h</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border flex flex-col items-center justify-center text-center">
                        <Zap className="w-4 h-4 text-amber-400 mb-1" />
                        <span className="text-xs text-muted-foreground">Intensidade</span>
                        <span className="font-semibold text-slate-700">{memory.weekly_intensity} ops/sem</span>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
