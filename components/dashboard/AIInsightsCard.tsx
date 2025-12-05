"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"

interface AIInsightsCardProps {
    kpis: any
    recentMovements: any[]
}

export function AIInsightsCard({ kpis, recentMovements }: AIInsightsCardProps) {
    const [insights, setInsights] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const generateInsights = async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/ai/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kpis: {
                        totalItens: kpis.totais?.itensEstoque || 0,
                        valorTotal: kpis.totais?.valorTotal || 0,
                        itensAbaixoMinimo: kpis.totais?.itensAbaixoMinimo || 0,
                    },
                    recentMovements: recentMovements.slice(0, 5).map((m: any) => ({
                        tipo: m.tipo,
                        produto: m.ferramentas?.nome,
                        quantidade: m.quantidade,
                        data: m.data
                    }))
                }),
            })

            if (!response.ok) throw new Error("Falha ao gerar insights")

            const data = await response.json()
            setInsights(data.insights || [])
            toast.success("Insights gerados com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar insights. Verifique sua chave de API.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 shadow-sm dark:from-zinc-900 dark:to-zinc-900 dark:border-zinc-800">
            <CardHeader className="pb-3 border-b border-indigo-50 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-semibold text-indigo-900 flex items-center gap-2 dark:text-indigo-400">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Insights Inteligentes (IA)
                    </CardTitle>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-900 dark:hover:bg-indigo-900/20"
                        onClick={generateInsights}
                        disabled={loading}
                    >
                        {loading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Lightbulb className="h-3.5 w-3.5" />
                        )}
                        {loading ? "Analisando..." : "Gerar Insights"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {insights.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm">
                        <p>Clique em &quot;Gerar Insights&quot; para analisar seus dados com IA.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {insights.map((insight, index) => (
                            <li key={index} className="flex gap-3 text-sm text-zinc-700 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 100}ms` }}>
                                <span className="text-lg select-none">{insight.substring(0, 2)}</span>
                                <span className="pt-0.5">{insight.substring(2).trim()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}
