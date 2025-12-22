"use client"

import { useState, useEffect, useRef } from "react"
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
import { useTranslation } from "react-i18next"
import { safeArray } from "@/lib/utils/safe-array"

// Cache configuration
const CACHE_KEY = "operium_ai_insights_cache"
const CACHE_TTL_HOURS = 6 // Cache válido por 6 horas

interface CachedInsights {
    insights: string[]
    period: string
    timestamp: number
    kpisHash: string // Para detectar mudanças significativas
}

interface AIInsightsCardProps {
    kpis: any
    recentMovements: any[]
}

// Gerar hash simples dos KPIs para detectar mudanças
const generateKpisHash = (kpis: any): string => {
    const data = {
        totalItens: kpis?.totais?.itensEstoque || 0,
        valorTotal: Math.round((kpis?.totais?.valorTotal || 0) / 100), // Arredondar para evitar mudanças pequenas
        itensAbaixoMinimo: kpis?.totais?.itensAbaixoMinimo || 0,
    }
    return JSON.stringify(data)
}

// Verificar se o cache ainda é válido
const isCacheValid = (cache: CachedInsights | null, currentKpisHash: string): boolean => {
    if (!cache) return false

    const now = Date.now()
    const cacheAge = now - cache.timestamp
    const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000 // Converter horas para ms

    // Cache expirado?
    if (cacheAge > maxAge) return false

    // KPIs mudaram significativamente?
    if (cache.kpisHash !== currentKpisHash) return false

    return true
}

// Carregar cache do localStorage
const loadCache = (): CachedInsights | null => {
    if (typeof window === "undefined") return null
    try {
        const cached = localStorage.getItem(CACHE_KEY)
        return cached ? JSON.parse(cached) : null
    } catch {
        return null
    }
}

// Salvar cache no localStorage
const saveCache = (insights: string[], period: string, kpisHash: string) => {
    if (typeof window === "undefined") return
    try {
        const cache: CachedInsights = {
            insights,
            period,
            timestamp: Date.now(),
            kpisHash,
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch {
        // Ignore storage errors
    }
}

// Calcular tempo restante do cache em formato legível
const getCacheTimeRemaining = (cache: CachedInsights | null): string | null => {
    if (!cache) return null
    const now = Date.now()
    const expiresAt = cache.timestamp + (CACHE_TTL_HOURS * 60 * 60 * 1000)
    const remaining = expiresAt - now
    if (remaining <= 0) return null

    const hours = Math.floor(remaining / (60 * 60 * 1000))
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))

    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}

export function AIInsightsCard({ kpis, recentMovements: initialMovements }: AIInsightsCardProps) {
    const { t } = useTranslation('common')
    const [insights, setInsights] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState("30") // default 30 days
    const [cacheInfo, setCacheInfo] = useState<string | null>(null)
    const { toast } = useToast()
    const supabase = createClientComponentClient()
    const hasInitialized = useRef(false)

    const generateInsights = async (forceRefresh = false) => {
        const currentKpisHash = generateKpisHash(kpis)

        // Verificar cache (apenas se não for refresh forçado)
        if (!forceRefresh) {
            const cache = loadCache()
            if (isCacheValid(cache, currentKpisHash) && cache) {
                setInsights(safeArray(cache.insights))
                setPeriod(cache.period)
                setCacheInfo(getCacheTimeRemaining(cache))
                return // Usar cache, não chamar API
            }
        }

        setLoading(true)
        setCacheInfo(null)
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

            const formattedMovements = safeArray(movementsData).map((m: any) => ({
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
            const newInsights = data.insights || []
            setInsights(newInsights)

            // Salvar no cache
            saveCache(newInsights, period, currentKpisHash)
            setCacheInfo(getCacheTimeRemaining({ insights: newInsights, period, timestamp: Date.now(), kpisHash: currentKpisHash }))

            toast.success(t("dashboard.ai.insights.toasts.success"))
        } catch (error) {
            console.error(error)
            toast.error(t("dashboard.ai.insights.toasts.error"))
        } finally {
            setLoading(false)
        }
    }

    // Helper to process insight string and remove bullets if present
    const cleanInsight = (text: string) => {
        // Remove leading bullets, numbers, hyphens
        return text.replace(/^[\s\-\*•\d\.]+\s*/, '')
    }

    // Inicializar - verificar cache primeiro, gerar apenas se necessário
    useEffect(() => {
        if (!hasInitialized.current && kpis?.totais) {
            hasInitialized.current = true
            generateInsights(false) // false = usar cache se válido
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kpis])

    return (
        <Card className="relative overflow-hidden border border-slate-200 shadow-sm bg-white dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-3 font-serif text-[#37352f] dark:text-zinc-100">
                        <Sparkles className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                        {t("dashboard.ai.insights.title")}
                    </CardTitle>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[160px] bg-transparent h-9 border-slate-200 focus:ring-zinc-500">
                                <SelectValue placeholder={t("dashboard.ai.insights.select_period")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">{t("dashboard.ai.insights.periods.daily")}</SelectItem>
                                <SelectItem value="7">{t("dashboard.ai.insights.periods.weekly")}</SelectItem>
                                <SelectItem value="15">{t("dashboard.ai.insights.periods.biweekly")}</SelectItem>
                                <SelectItem value="30">{t("dashboard.ai.insights.periods.monthly")}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={() => generateInsights(true)}
                            disabled={loading}
                            className="bg-[#1C1C1C] hover:bg-[#37352f] text-white h-9 px-4 font-medium transition-all w-full sm:w-auto flex items-center gap-2"
                        >
                            {loading ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Lightbulb className="h-4 w-4" />
                            )}
                            <span>{loading ? t("dashboard.ai.insights.button.loading") : t("dashboard.ai.insights.button.idle")}</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 min-h-[160px] flex flex-col justify-center">
                {loading ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                        <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-full animate-pulse">
                            <Sparkles className="h-6 w-6 text-slate-400 animate-spin" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-[#37352f] dark:text-zinc-100">{t("dashboard.ai.insights.button.loading")}</p>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                Analisando seus dados...
                            </p>
                        </div>
                    </div>
                ) : safeArray(insights).length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                        <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-full">
                            <Sparkles className="h-6 w-6 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-[#37352f] dark:text-zinc-100">{t("dashboard.ai.insights.empty.title")}</p>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                {t("dashboard.ai.insights.empty.desc")}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest dark:text-zinc-400">
                                {t("dashboard.ai.insights.summary_title", { days: period })}
                            </p>
                            <span className="text-[10px] text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full dark:text-zinc-400 dark:border-zinc-600">
                                {cacheInfo ? `⏱️ Atualiza em ${cacheInfo}` : t("dashboard.ai.insights.generated_now")}
                            </span>
                        </div>
                        <div className="grid gap-3">
                            {safeArray(insights).map((insight, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
                                    style={{ animationDelay: `${index * 150}ms` }}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        <Sparkles className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                                    </div>
                                    <div className="text-sm text-[#37352f] dark:text-zinc-200 leading-relaxed font-medium">
                                        {(() => {
                                            const text = cleanInsight(insight)
                                            // Check for **Title:** format or similar
                                            const match = text.match(/\*\*(.*?)\*\*:?\s*(.*)/)
                                            if (match) {
                                                return (
                                                    <>
                                                        <span className="block font-bold mb-0.5 text-zinc-900 dark:text-zinc-50">{match[1]}</span>
                                                        <span className="text-zinc-600 dark:text-zinc-400 font-normal">{match[2]}</span>
                                                    </>
                                                )
                                            }
                                            return text
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
