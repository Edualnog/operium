"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HoverButton } from "@/components/ui/hover-button"
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClientComponentClient } from "@/lib/supabase-client"

interface AIInsightsCardProps {
    kpis: any
    recentMovements: any[]
}

export function AIInsightsCard({ kpis, recentMovements: initialMovements }: AIInsightsCardProps) {
    const [insights, setInsights] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState("30") // default 30 days
    const { toast } = useToast()
    const supabase = createClientComponentClient()

    const generateInsights = async () => {
        setLoading(true)
        try {
            // Fetch movements based on selected period
            const days = parseInt(period)
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)

            const { data: movementsData, error } = await supabase
                .from("movimentacoes")
                .select("tipo, quantidade, data, ferramentas(nome)")
                .gte("data", startDate.toISOString())
                .order("data", { ascending: false })
                .limit(50) // Limit to avoid token limits

            if (error) throw error

            const formattedMovements = movementsData?.map((m: any) => ({
                tipo: m.tipo,
                produto: m.ferramentas?.nome,
                quantidade: m.quantidade,
                data: new Date(m.data).toLocaleDateString('pt-BR')
            })) || []

            const response = await fetch("/api/ai/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kpis: {
                        totalItens: kpis.totais?.itensEstoque || 0,
                        valorTotal: kpis.totais?.valorTotal || 0,
                        itensAbaixoMinimo: kpis.totais?.itensAbaixoMinimo || 0,
                    },
                    recentMovements: formattedMovements, // Use fetched movements
                    period: days // Inform API about the period
                }),
            })

            if (!response.ok) throw new Error("Falha ao gerar insights")

            const data = await response.json()
            setInsights(data.insights || [])
            toast.success("Insights gerados com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar insights. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="relative overflow-hidden border border-indigo-100/50 dark:border-indigo-500/20 shadow-xl bg-gradient-to-br from-white/80 via-indigo-50/30 to-purple-50/30 dark:from-zinc-900/80 dark:via-indigo-950/10 dark:to-purple-950/10 backdrop-blur-sm">

            {/* Decorative background blobs */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <CardHeader className="pb-4 border-b border-indigo-100/50 dark:border-indigo-500/20 relative z-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-inner">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            Insights Inteligentes (IA)
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[160px] bg-white/50 dark:bg-zinc-800/50 h-10 border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-sm focus:ring-indigo-500/20 transition-all hover:bg-white/80 dark:hover:bg-zinc-800/80">
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Diário (24h)</SelectItem>
                                <SelectItem value="7">Semanal (7 dias)</SelectItem>
                                <SelectItem value="15">Quinzenal (15 dias)</SelectItem>
                                <SelectItem value="30">Mensal (30 dias)</SelectItem>
                            </SelectContent>
                        </Select>

                        <HoverButton
                            onClick={generateInsights}
                            disabled={loading}
                            className="h-10 px-6 text-sm font-semibold tracking-wide shadow-lg hover:shadow-indigo-500/25 w-full sm:w-auto"
                            backgroundColor="#4f46e5"
                            glowColor="#a855f7"
                        >
                            {loading ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Lightbulb className="h-4 w-4" />
                            )}
                            <span>{loading ? "Analisando..." : "Gerar Insights"}</span>
                        </HoverButton>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 relative z-10 min-h-[160px] flex flex-col justify-center">
                {insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                            <div className="relative p-4 bg-white dark:bg-zinc-800 rounded-full border border-indigo-100 dark:border-zinc-700 shadow-sm">
                                <Sparkles className="h-8 w-8 text-indigo-500/70" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">Pronto para analisar?</p>
                            <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                                Selecione um período acima e deixe nossa IA encontrar padrões e oportunidades nos seus dados.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                Resumo dos últimos {period} dias
                            </p>
                            <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                                Gerado agora
                            </span>
                        </div>
                        <div className="grid gap-3">
                            {insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className="group relative flex items-start gap-4 p-4 rounded-xl bg-white/60 dark:bg-zinc-800/60 border border-white/50 dark:border-zinc-700/50 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-zinc-800/80 transition-all duration-300"
                                    style={{ animationDelay: `${index * 150}ms` }}
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <span className="text-2xl select-none filter drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300">
                                        {insight.substring(0, 2)}
                                    </span>
                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pt-1">
                                        {insight.substring(2).trim()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
