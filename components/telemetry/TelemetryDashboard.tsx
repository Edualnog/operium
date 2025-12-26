"use client"

import { useState, useEffect } from "react"
import {
    Activity,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Database,
    Terminal,
    Table,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface TelemetryEvent {
    event_id: string
    ts: string
    event_name: string
    entity_type: string
    profile_id?: string
    actor_id?: string
    entity_id?: string
    props?: Record<string, any>
}

const ROWS_PER_PAGE = 20

export function TelemetryDashboard() {
    const [events, setEvents] = useState<TelemetryEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [date, setDate] = useState(new Date().toISOString().split("T")[0])
    const [message, setMessage] = useState("")
    const [debug, setDebug] = useState<any>(null)
    const [showAll, setShowAll] = useState(false)
    const [page, setPage] = useState(1)
    const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'debug'>('events')

    const fetchEvents = async (all = false) => {
        setLoading(true)
        setError(null)
        try {
            const url = all
                ? `/api/admin/telemetry?date=${date}&all=true&limit=500`
                : `/api/admin/telemetry?date=${date}&limit=500`
            const response = await fetch(url)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || data.message || "Erro ao buscar eventos")
            }

            setEvents(data.events || [])
            setMessage(data.message)
            setDebug(data.debug)
            setPage(1) // Reset to page 1 on new fetch
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents(showAll)
    }, [date, showAll])

    // Pagination
    const totalPages = Math.ceil(events.length / ROWS_PER_PAGE)
    const paginatedEvents = events.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

    // Stats
    const eventsByType = events.reduce((acc, event) => {
        acc[event.event_name] = (acc[event.event_name] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const eventsByEntityType = events.reduce((acc, event) => {
        acc[event.entity_type] = (acc[event.entity_type] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="font-mono text-sm">
            {/* Header - Terminal Style */}
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-t-lg px-4 py-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-zinc-600" />
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">operium_telemetry</span>
                </div>
                <span className="text-zinc-400">|</span>
                <span className="text-zinc-500">{events.length} rows</span>
                <span className="text-zinc-400">|</span>
                <span className="text-green-600">{loading ? "QUERYING..." : "READY"}</span>
            </div>

            {/* Query Bar */}
            <div className="bg-white dark:bg-zinc-950 border-x border-zinc-300 dark:border-zinc-700 px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className="text-purple-600 font-bold">SELECT</span>
                <span className="text-zinc-600">* FROM</span>
                <span className="text-blue-600 font-bold">telemetry_events</span>
                <span className="text-zinc-600">WHERE</span>
                <span className="text-orange-600">date =</span>
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-36 h-7 font-mono text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-300"
                />
                <Button
                    variant={showAll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowAll(!showAll)}
                    className="h-7 text-xs"
                >
                    {showAll ? "-- ALL DATES" : "-- FILTER DATE"}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchEvents(showAll)}
                    disabled={loading}
                    className="h-7 text-xs"
                >
                    <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                    RUN
                </Button>
            </div>

            {/* Tabs */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border-x border-zinc-300 dark:border-zinc-700 px-4 py-2 flex gap-1">
                <button
                    onClick={() => setActiveTab('events')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${activeTab === 'events'
                        ? 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 shadow-sm'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                >
                    <Table className="h-3 w-3 inline mr-1" />
                    Results
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${activeTab === 'stats'
                        ? 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 shadow-sm'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                >
                    <Activity className="h-3 w-3 inline mr-1" />
                    Stats
                </button>
                <button
                    onClick={() => setActiveTab('debug')}
                    className={`px-3 py-1 rounded text-xs transition-colors ${activeTab === 'debug'
                        ? 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 shadow-sm'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                >
                    <Terminal className="h-3 w-3 inline mr-1" />
                    Debug
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-x border-zinc-300 dark:border-zinc-700 px-4 py-2 text-red-600 text-xs">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    ERROR: {error}
                </div>
            )}

            {/* Content */}
            <div className="bg-white dark:bg-zinc-950 border-x border-zinc-300 dark:border-zinc-700 overflow-x-auto">
                {activeTab === 'events' && (
                    <>
                        {/* Table Header */}
                        <table className="w-full text-xs">
                            <thead className="bg-zinc-100 dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-700">
                                <tr>
                                    <th className="text-left px-3 py-2 text-zinc-500 font-medium w-8">#</th>
                                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">timestamp</th>
                                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">event_name</th>
                                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">entity_type</th>
                                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">entity_id</th>
                                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">props</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-zinc-400">
                                            Executing query...
                                        </td>
                                    </tr>
                                ) : paginatedEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-zinc-400">
                                            0 rows returned
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedEvents.map((event, idx) => (
                                        <tr
                                            key={event.event_id}
                                            className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                        >
                                            <td className="px-3 py-2 text-zinc-400">
                                                {(page - 1) * ROWS_PER_PAGE + idx + 1}
                                            </td>
                                            <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">
                                                {new Date(event.ts).toLocaleString("pt-BR")}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="text-green-600 font-medium">{event.event_name}</span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant="outline" className="text-xs font-mono">
                                                    {event.entity_type}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2 text-zinc-400 font-mono text-xs">
                                                {event.entity_id ? event.entity_id.substring(0, 8) + "..." : "NULL"}
                                            </td>
                                            <td className="px-3 py-2 max-w-xs">
                                                <code className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                                                    {event.props ? JSON.stringify(event.props).substring(0, 50) + (JSON.stringify(event.props).length > 50 ? "..." : "") : "{}"}
                                                </code>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </>
                )}

                {activeTab === 'stats' && (
                    <div className="p-4 space-y-6">
                        {/* Events by Type */}
                        <div>
                            <h3 className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">
                                SELECT event_name, COUNT(*) FROM telemetry_events GROUP BY event_name
                            </h3>
                            <table className="w-full text-xs border border-zinc-200 dark:border-zinc-700">
                                <thead className="bg-zinc-100 dark:bg-zinc-900">
                                    <tr>
                                        <th className="text-left px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">event_name</th>
                                        <th className="text-right px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(eventsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                                        <tr key={type} className="border-b border-zinc-100 dark:border-zinc-800">
                                            <td className="px-3 py-2 text-green-600">{type}</td>
                                            <td className="px-3 py-2 text-right text-blue-600 font-bold">{count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Events by Entity Type */}
                        <div>
                            <h3 className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">
                                SELECT entity_type, COUNT(*) FROM telemetry_events GROUP BY entity_type
                            </h3>
                            <table className="w-full text-xs border border-zinc-200 dark:border-zinc-700">
                                <thead className="bg-zinc-100 dark:bg-zinc-900">
                                    <tr>
                                        <th className="text-left px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">entity_type</th>
                                        <th className="text-right px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(eventsByEntityType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                                        <tr key={type} className="border-b border-zinc-100 dark:border-zinc-800">
                                            <td className="px-3 py-2 text-purple-600">{type}</td>
                                            <td className="px-3 py-2 text-right text-blue-600 font-bold">{count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'debug' && (
                    <div className="p-4 space-y-4 text-xs">
                        <h3 className="text-zinc-500 uppercase tracking-wide">-- SYSTEM VARIABLES</h3>
                        {debug ? (
                            <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded border border-zinc-200 dark:border-zinc-700 font-mono">
                                <div className="grid grid-cols-2 gap-2">
                                    <span className="text-zinc-500">@bucket:</span>
                                    <span className="text-blue-600">&apos;{debug.bucket}&apos;</span>
                                    <span className="text-zinc-500">@total_objects:</span>
                                    <span className="text-green-600">{debug.total_objects_in_bucket}</span>
                                    <span className="text-zinc-500">@matching_objects:</span>
                                    <span className="text-green-600">{debug.matching_objects}</span>
                                    <span className="text-zinc-500">@date_pattern:</span>
                                    <span className="text-orange-600">&apos;{debug.date_pattern}&apos;</span>
                                </div>

                                {debug.all_object_keys && debug.all_object_keys.length > 0 && (
                                    <div className="mt-4">
                                        <span className="text-zinc-500">-- OBJECT KEYS ({debug.all_object_keys.length})</span>
                                        <div className="mt-2 max-h-40 overflow-auto bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-700">
                                            {debug.all_object_keys.map((key: string, i: number) => (
                                                <div key={i} className="text-zinc-600 py-0.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                                    {key}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-zinc-400">No debug info available. Run query first.</div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer - Pagination */}
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-b-lg px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                    {message}
                </span>

                {totalPages > 1 && activeTab === 'events' && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-6 w-6 p-0"
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-zinc-600">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="h-6 w-6 p-0"
                        >
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
