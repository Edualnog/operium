"use client"

import { useState, useEffect } from "react"
import {
    Activity,
    Calendar,
    RefreshCw,
    Filter,
    BarChart3,
    Users,
    Package,
    Truck,
    Wrench,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TelemetryEvent {
    event_id: string
    ts: string
    event_name: string
    entity_type: string
    profile_id?: string
    actor_id?: string
    props?: Record<string, any>
    context?: {
        flow?: string
        screen?: string
    }
}

interface TelemetryResponse {
    success: boolean
    date: string
    r2_configured: boolean
    events: TelemetryEvent[]
    message: string
    total: number
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
    COLLABORATOR_CREATED: <Users className="h-4 w-4 text-green-500" />,
    COLLABORATOR_UPDATED: <Users className="h-4 w-4 text-blue-500" />,
    COLLABORATOR_DELETED: <Users className="h-4 w-4 text-red-500" />,
    COLLABORATOR_DISMISSED: <Users className="h-4 w-4 text-orange-500" />,
    MOVEMENT_CHECKOUT: <Package className="h-4 w-4 text-yellow-500" />,
    MOVEMENT_CHECKIN: <Package className="h-4 w-4 text-green-500" />,
    MOVEMENT_STOCK_IN: <Package className="h-4 w-4 text-blue-500" />,
    ASSET_CREATED: <Wrench className="h-4 w-4 text-green-500" />,
    ASSET_UPDATED: <Wrench className="h-4 w-4 text-blue-500" />,
    TEAM_CREATED: <Users className="h-4 w-4 text-purple-500" />,
    MAINTENANCE_STARTED: <Wrench className="h-4 w-4 text-orange-500" />,
    ORGANIZATION_ONBOARDED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
}

const INDUSTRY_LABELS: Record<string, string> = {
    MANUFACTURING: "Indústria",
    CONSTRUCTION: "Construção Civil",
    LOGISTICS: "Logística",
    MAINTENANCE_SERVICES: "Manutenção",
    AGRO: "Agronegócio",
    OTHER: "Outros"
}

const SIZE_LABELS: Record<string, string> = {
    SOLO: "Autônomo",
    SMALL: "Pequena",
    MEDIUM: "Média",
    LARGE: "Grande",
    ENTERPRISE: "Enterprise"
}

export function TelemetryDashboard() {
    const [events, setEvents] = useState<TelemetryEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [date, setDate] = useState(new Date().toISOString().split("T")[0])
    const [r2Configured, setR2Configured] = useState(false)
    const [message, setMessage] = useState("")

    const fetchEvents = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/admin/telemetry?date=${date}`)
            const data: TelemetryResponse = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Erro ao buscar eventos")
            }

            setEvents(data.events)
            setR2Configured(data.r2_configured)
            setMessage(data.message)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()
    }, [date])

    // Stats calculations
    const eventsByType = events.reduce((acc, event) => {
        acc[event.event_name] = (acc[event.event_name] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const eventsByIndustry = events.reduce((acc, event) => {
        const industry = event.props?.org_industry || "unknown"
        acc[industry] = (acc[industry] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Activity className="h-6 w-6 text-purple-500" />
                        Telemetry Dashboard
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Visualize eventos de telemetria do Cloudflare R2
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-40"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchEvents}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Status Alert */}
            {message && (
                <div className={`p-4 rounded-lg border ${r2Configured
                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                        : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                    }`}>
                    <div className="flex items-center gap-2">
                        {r2Configured ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <span className={`text-sm ${r2Configured ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
                            }`}>
                            {message}
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total de Eventos</CardDescription>
                        <CardTitle className="text-3xl">{events.length}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Tipos de Evento</CardDescription>
                        <CardTitle className="text-3xl">{Object.keys(eventsByType).length}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Setores Ativos</CardDescription>
                        <CardTitle className="text-3xl">{Object.keys(eventsByIndustry).filter(k => k !== "unknown").length}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Data Selecionada</CardDescription>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(date).toLocaleDateString("pt-BR")}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="events" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="events">Eventos</TabsTrigger>
                    <TabsTrigger value="byType">Por Tipo</TabsTrigger>
                    <TabsTrigger value="byIndustry">Por Setor</TabsTrigger>
                </TabsList>

                {/* Events List */}
                <TabsContent value="events" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Eventos Recentes
                            </CardTitle>
                            <CardDescription>
                                Lista de eventos ordenados por timestamp
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8 text-zinc-500">
                                    Carregando eventos...
                                </div>
                            ) : events.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    Nenhum evento encontrado para esta data
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {events.map((event) => (
                                        <div
                                            key={event.event_id}
                                            className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                        >
                                            <div className="mt-1">
                                                {EVENT_ICONS[event.event_name] || <Activity className="h-4 w-4 text-zinc-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                        {event.event_name}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {event.entity_type}
                                                    </Badge>
                                                    {event.props?.org_industry && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {INDUSTRY_LABELS[event.props.org_industry] || event.props.org_industry}
                                                        </Badge>
                                                    )}
                                                    {event.props?.org_size && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {SIZE_LABELS[event.props.org_size] || event.props.org_size}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-1">
                                                    {new Date(event.ts).toLocaleString("pt-BR")}
                                                </div>
                                                {event.props && Object.keys(event.props).filter(k => !k.startsWith("org_")).length > 0 && (
                                                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 p-2 rounded font-mono">
                                                        {JSON.stringify(
                                                            Object.fromEntries(
                                                                Object.entries(event.props).filter(([k]) => !k.startsWith("org_"))
                                                            ),
                                                            null,
                                                            2
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* By Type */}
                <TabsContent value="byType">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Eventos por Tipo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {Object.entries(eventsByType)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([type, count]) => (
                                        <div key={type} className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                            <div className="flex items-center gap-2">
                                                {EVENT_ICONS[type] || <Activity className="h-4 w-4 text-zinc-400" />}
                                                <span className="text-sm font-medium">{type}</span>
                                            </div>
                                            <Badge>{count}</Badge>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* By Industry */}
                <TabsContent value="byIndustry">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Eventos por Setor
                            </CardTitle>
                            <CardDescription>
                                Distribuição de eventos por setor de atuação
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {Object.entries(eventsByIndustry)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([industry, count]) => (
                                        <div key={industry} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                            <span className="font-medium">
                                                {INDUSTRY_LABELS[industry] || industry}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                                                    <div
                                                        className="bg-purple-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${(count / events.length) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                                <Badge variant="secondary">{count}</Badge>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
