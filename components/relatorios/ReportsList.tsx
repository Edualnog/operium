"use client"

import { useState } from "react"
import { DailyReport, getDailyReports } from "@/app/dashboard/relatorios/actions"
import { Calendar, Filter, Search, FileText, Download } from "lucide-react"

export default function ReportsList({
    initialReports,
    teams
}: {
    initialReports: DailyReport[]
    teams: { id: string; name: string; deleted_at: string | null }[]
}) {
    const [reports, setReports] = useState(initialReports)
    const [loading, setLoading] = useState(false)
    const [dateFilter, setDateFilter] = useState("")
    const [teamFilter, setTeamFilter] = useState("")
    const [searchTerm, setSearchTerm] = useState("")

    const handleFilter = async () => {
        setLoading(true)
        try {
            const data = await getDailyReports(
                dateFilter || undefined,
                teamFilter || undefined
            )
            setReports(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const filteredReports = reports.filter(r =>
        r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Data</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Equipe</label>
                    <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    >
                        <option value="">Todas as equipes</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name} {t.deleted_at ? '(Arquivada)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={handleFilter}
                        disabled={loading}
                        className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-2 h-10"
                    >
                        {loading ? 'Filtrando...' : (
                            <>
                                <Filter className="h-4 w-4" />
                                Filtrar
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Buscar por resumo ou usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-transparent border-b border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-zinc-400 transition-colors"
                />
            </div>

            {/* List */}
            <div className="space-y-4">
                {filteredReports.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        Nenhum relatório encontrado para os filtros selecionados.
                    </div>
                ) : (
                    filteredReports.map(report => (
                        <div
                            key={report.id}
                            className="group p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {report.user_name}
                                        </h3>
                                        <span className={`px-2 py-0.5 text-xs rounded-full border ${report.team_deleted
                                                ? 'bg-red-50 text-red-700 border-red-100'
                                                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                            }`}>
                                            {report.team_name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        {new Date(report.report_date).toLocaleDateString()} • Enviado em {new Date(report.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <FileText className="h-5 w-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                            </div>

                            <div className="mt-3 space-y-2">
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    {report.summary}
                                </p>
                                {report.notes && (
                                    <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-200 pl-3 py-1">
                                        "{report.notes}"
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
