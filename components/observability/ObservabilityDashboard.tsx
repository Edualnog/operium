'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Database,
    Play,
    RefreshCw,
    TrendingUp,
    Zap,
    Bell,
    FileText,
    BarChart3,
    XCircle,
    AlertCircle,
    Eye
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface HealthData {
    status: 'HEALTHY' | 'WARNING' | 'DEGRADED' | 'CRITICAL'
    metrics: {
        total_active: number
        with_baseline: number
        without_sufficient_baseline: number
        stale: any[] | null
    }
    alerts: {
        active: number
        critical: number
    }
    execution: {
        last_pipeline: string | null
        last_24h_total: number
        last_24h_errors: number
        error_rate_24h: number
    }
    recommendations: string[]
}

interface Alert {
    id: string
    metric_key: string
    entity_type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    observed_value: number
    expected_avg: number
    deviation_score: number
    explanation: string
    detected_at: string
    is_active: boolean
}

interface DomainEvent {
    id: string
    entity_type: string
    event_type: string
    event_source: string
    occurred_at: string
    payload: any
}

interface MetricStatus {
    metric_key: string
    display_name: string
    entity_type: string
    current_value: number | null
    confidence_level: string | null
    last_calculated: string | null
    expected_avg: number | null
    data_status: 'CURRENT' | 'STALE' | 'NO_DATA'
}

export function ObservabilityDashboard() {
    const { t } = useTranslation()
    const supabase = createClientComponentClient()

    const [health, setHealth] = useState<HealthData | null>(null)
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [events, setEvents] = useState<DomainEvent[]>([])
    const [metrics, setMetrics] = useState<MetricStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [runningPipeline, setRunningPipeline] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch GLOBAL health (all organizations)
            const { data: healthData, error: healthError } = await supabase
                .rpc('fn_metrics_health_global')

            if (healthError) {
                // Fallback para função por profile se global não existir
                console.warn('Global health not available, falling back to profile-based:', healthError)
                const { data: fallbackHealth } = await supabase
                    .rpc('fn_metrics_health', { p_profile_id: user.id })
                setHealth(fallbackHealth)
            } else {
                setHealth(healthData)
            }

            // Fetch GLOBAL alerts (all organizations)
            const { data: alertsData } = await supabase
                .from('v_operational_alerts_global')
                .select('*')
                .eq('is_active', true)
                .order('detected_at', { ascending: false })
                .limit(20)

            // Fallback para tabela normal se view não existir
            if (!alertsData) {
                const { data: fallbackAlerts } = await supabase
                    .from('operational_alerts')
                    .select('*')
                    .eq('is_active', true)
                    .order('detected_at', { ascending: false })
                    .limit(20)
                setAlerts(fallbackAlerts || [])
            } else {
                setAlerts(alertsData || [])
            }

            // Fetch GLOBAL events (all organizations)
            const { data: eventsData } = await supabase
                .from('v_domain_events_global')
                .select('*')
                .order('occurred_at', { ascending: false })
                .limit(50)

            // Fallback para tabela normal se view não existir
            if (!eventsData) {
                const { data: fallbackEvents } = await supabase
                    .from('domain_events')
                    .select('*')
                    .order('occurred_at', { ascending: false })
                    .limit(50)
                setEvents(fallbackEvents || [])
            } else {
                setEvents(eventsData || [])
            }

            // Fetch GLOBAL metrics status (all organizations aggregated)
            const { data: metricsData } = await supabase
                .from('v_metrics_status_global')
                .select('*')

            // Fallback para view normal se view global não existir
            if (!metricsData) {
                const { data: fallbackMetrics } = await supabase
                    .from('v_metrics_status')
                    .select('*')
                setMetrics(fallbackMetrics || [])
            } else {
                // Adaptar campos da view global para interface existente
                const adaptedMetrics = metricsData.map((m: any) => ({
                    metric_key: m.metric_key,
                    display_name: m.display_name,
                    entity_type: m.entity_type,
                    current_value: m.avg_value_global,
                    confidence_level: null,
                    last_calculated: m.last_calculated_global,
                    expected_avg: null,
                    data_status: m.data_status
                }))
                setMetrics(adaptedMetrics || [])
            }

        } catch (err: any) {
            console.error('Error fetching observability data:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const runObserver = async () => {
        setRunningPipeline(true)
        try {
            // Executar Observer GLOBALMENTE para todos os profiles
            const { data, error } = await supabase
                .rpc('fn_run_observer_global', {
                    p_triggered_by: 'manual'
                })

            if (error) {
                // Fallback para execução por profile se global não existir
                console.warn('Global observer not available, falling back to profile-based:', error)
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    await supabase.rpc('fn_run_all_metrics', {
                        p_profile_id: user.id,
                        p_triggered_by: 'manual'
                    })
                }
            }

            // Refresh data after running
            await fetchData()

        } catch (err: any) {
            console.error('Error running observer:', err)
            setError(err.message)
        } finally {
            setRunningPipeline(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'HEALTHY': return 'bg-emerald-500'
            case 'WARNING': return 'bg-yellow-500'
            case 'DEGRADED': return 'bg-orange-500'
            case 'CRITICAL': return 'bg-red-500'
            default: return 'bg-gray-500'
        }
    }

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return <Badge className="bg-red-500 text-white">CRITICAL</Badge>
            case 'HIGH': return <Badge className="bg-orange-500 text-white">HIGH</Badge>
            case 'MEDIUM': return <Badge className="bg-yellow-500 text-black">MEDIUM</Badge>
            case 'LOW': return <Badge className="bg-blue-500 text-white">LOW</Badge>
            default: return <Badge>{severity}</Badge>
        }
    }

    const getDataStatusIcon = (status: string) => {
        switch (status) {
            case 'CURRENT': return <CheckCircle className="h-4 w-4 text-emerald-500" />
            case 'STALE': return <AlertCircle className="h-4 w-4 text-yellow-500" />
            case 'NO_DATA': return <XCircle className="h-4 w-4 text-gray-400" />
            default: return null
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Nunca'
        return new Date(dateStr).toLocaleString('pt-BR')
    }

    // Observer Doctrine: Confidence threshold for displaying numeric values
    const CONFIDENCE_THRESHOLD = ['MEDIUM', 'HIGH', 'VERIFIED']

    const isConfidenceSufficient = (confidence: string | null): boolean => {
        if (!confidence) return false
        return CONFIDENCE_THRESHOLD.includes(confidence.toUpperCase())
    }

    const getBaselineText = (expectedAvg: number | null): string => {
        if (expectedAvg) return `Esperado: ${expectedAvg.toFixed(2)}`
        return 'Baseline em formação'
    }

    const getBaselineTooltip = (expectedAvg: number | null): string => {
        if (expectedAvg) return `Valor médio esperado baseado em dados históricos`
        return 'Esta métrica está acumulando dados suficientes para estabelecer um padrão confiável de referência.'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Observabilidade</h1>
                    <p className="text-muted-foreground">
                        Monitoramento em tempo real do sistema
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button
                        onClick={runObserver}
                        disabled={runningPipeline}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Play className={`h-4 w-4 mr-2 ${runningPipeline ? 'animate-pulse' : ''}`} />
                        {runningPipeline ? 'Executando...' : 'Executar Observer'}
                    </Button>
                </div>
            </div>

            {/* Error display */}
            {error && (
                <Card className="border-red-500 bg-red-500/10">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Health Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Status do Sistema
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${getStatusColor(health?.status || 'HEALTHY')}`} />
                            <span className="text-2xl font-bold">{health?.status || 'N/A'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Active Alerts Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Alertas Ativos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-yellow-500" />
                            <span className="text-2xl font-bold">{health?.alerts?.active || 0}</span>
                            {(health?.alerts?.critical || 0) > 0 && (
                                <Badge className="bg-red-500 text-white">{health.alerts.critical} crítico(s)</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Metrics Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Métricas Ativas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            <span className="text-2xl font-bold">{health?.metrics?.total_active || 0}</span>
                            <span className="text-sm text-muted-foreground">
                                ({health?.metrics?.with_baseline || 0} com padrão estabelecido)
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Last Execution Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Última Execução
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">
                                {formatDate(health?.execution?.last_pipeline || null)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="alerts" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="alerts" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Alertas
                        {alerts.length > 0 && (
                            <Badge variant="secondary" className="ml-1">{alerts.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="metrics" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Métricas
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Eventos
                        {events.length > 0 && (
                            <Badge variant="secondary" className="ml-1">{events.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Health
                    </TabsTrigger>
                </TabsList>

                {/* Alerts Tab */}
                <TabsContent value="alerts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alertas Operacionais</CardTitle>
                            <CardDescription>
                                Desvios detectados automaticamente pelo observador
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {alerts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                                    <p>Nenhum alerta ativo</p>
                                    <p className="text-sm">Tudo está funcionando normalmente</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getSeverityBadge(alert.severity)}
                                                    <span className="font-medium">{alert.metric_key}</span>
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {formatDate(alert.detected_at)}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm">{alert.explanation}</p>
                                            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                                <span>Observado: {alert.observed_value?.toFixed(2)}</span>
                                                <span>Esperado: {alert.expected_avg?.toFixed(2)}</span>
                                                <span>Desvio: {alert.deviation_score?.toFixed(1)}σ</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Metrics Tab */}
                <TabsContent value="metrics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status das Métricas</CardTitle>
                            <CardDescription>
                                Indicadores internos em observação sistêmica contínua
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TooltipProvider>
                                <div className="space-y-2">
                                    {metrics.map((metric) => {
                                        const confidenceSufficient = isConfidenceSufficient(metric.confidence_level)

                                        return (
                                            <div
                                                key={metric.metric_key}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getDataStatusIcon(metric.data_status)}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium">{metric.display_name}</p>
                                                            {/* Observer Doctrine: Systemic observation badge */}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-xs font-normal text-slate-500 border-slate-300 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 cursor-help"
                                                                    >
                                                                        <Eye className="h-3 w-3 mr-1" />
                                                                        Em observação
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs">
                                                                    <p>Indicador interno calculado a partir de dados agregados do uso da plataforma. Não representa avaliação individual.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {metric.metric_key} • {metric.entity_type}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {/* Observer Doctrine: Conditional value display based on confidence */}
                                                    {confidenceSufficient && metric.current_value !== null ? (
                                                        <p className="font-mono text-lg">
                                                            {metric.current_value.toFixed(2)}
                                                        </p>
                                                    ) : (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 italic cursor-help">
                                                                    Em observação
                                                                </p>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <p>Dados ainda insuficientes para exibição numérica confiável</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    {/* Observer Doctrine: Baseline text with tooltip */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <p className="text-xs text-muted-foreground cursor-help">
                                                                {getBaselineText(metric.expected_avg)}
                                                            </p>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p>{getBaselineTooltip(metric.expected_avg)}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </TooltipProvider>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events">
                    <Card>
                        <CardHeader>
                            <CardTitle>Stream de Eventos</CardTitle>
                            <CardDescription>
                                Últimos 50 eventos capturados pelo sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {events.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Database className="h-12 w-12 mx-auto mb-4" />
                                    <p>Nenhum evento registrado ainda</p>
                                    <p className="text-sm">Execute operações no sistema para gerar eventos</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {events.map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 text-sm"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {event.entity_type}
                                                </Badge>
                                                <span className="font-medium">{event.event_type}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-muted-foreground">
                                                <Badge variant="secondary" className="text-xs">
                                                    {event.event_source}
                                                </Badge>
                                                <span className="text-xs">
                                                    {formatDate(event.occurred_at)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Health Tab */}
                <TabsContent value="health">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhes de Saúde</CardTitle>
                            <CardDescription>
                                Informações detalhadas do sistema de observabilidade
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6">
                                {/* Execution Stats */}
                                <div>
                                    <h3 className="font-medium mb-3">Estatísticas de Execução (24h)</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="border rounded-lg p-4 text-center">
                                            <p className="text-2xl font-bold">{health?.execution?.last_24h_total || 0}</p>
                                            <p className="text-sm text-muted-foreground">Total Execuções</p>
                                        </div>
                                        <div className="border rounded-lg p-4 text-center">
                                            <p className="text-2xl font-bold text-red-500">{health?.execution?.last_24h_errors || 0}</p>
                                            <p className="text-sm text-muted-foreground">Erros</p>
                                        </div>
                                        <div className="border rounded-lg p-4 text-center">
                                            <p className="text-2xl font-bold">{health?.execution?.error_rate_24h || 0}%</p>
                                            <p className="text-sm text-muted-foreground">Taxa de Erro</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {health?.recommendations && health.recommendations.length > 0 && (
                                    <div>
                                        <h3 className="font-medium mb-3">Recomendações</h3>
                                        <div className="space-y-2">
                                            {health.recommendations.map((rec, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-yellow-500/10">
                                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                    <span className="text-sm">{rec}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Raw Health Data */}
                                <div>
                                    <h3 className="font-medium mb-3">Dados Brutos</h3>
                                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-64">
                                        {JSON.stringify(health, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
