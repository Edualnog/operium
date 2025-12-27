"use client"

import { useState } from "react"
import { DailyReport, getDailyReports } from "@/app/dashboard/relatorios/actions"
import { Calendar, Filter, Search, FileText, Download, ChevronLeft, ChevronRight, User, Users } from "lucide-react"

const ITEMS_PER_PAGE = 10

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
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'TEAM'>('ALL')
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)

    const handleFilter = async () => {
        setLoading(true)
        setCurrentPage(1) // Reset to first page on filter
        try {
            const data = await getDailyReports(
                dateFilter || undefined,
                teamFilter || undefined,
                typeFilter
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

    // Pagination
    const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const paginatedReports = filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE)

    // PDF Export function
    const handleExportPDF = (report: DailyReport) => {
        // Create a simple HTML content for the PDF
        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Relatório - ${report.user_name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { color: #18181b; border-bottom: 2px solid #e4e4e7; padding-bottom: 10px; }
                    .meta { color: #71717a; font-size: 14px; margin-bottom: 20px; }
                    .content { font-size: 16px; line-height: 1.6; color: #27272a; }
                    .notes { margin-top: 20px; padding: 15px; background: #f4f4f5; border-left: 4px solid #a1a1aa; font-style: italic; }
                    .footer { margin-top: 40px; font-size: 12px; color: #a1a1aa; border-top: 1px solid #e4e4e7; padding-top: 10px; }
                </style>
            </head>
            <body>
                <h1>Relatório de Campo</h1>
                <div class="meta">
                    <strong>Colaborador:</strong> ${report.user_name}<br>
                    <strong>Equipe:</strong> ${report.team_name}<br>
                    <strong>Data:</strong> ${new Date(report.report_date).toLocaleDateString('pt-BR')}<br>
                    <strong>Enviado em:</strong> ${new Date(report.created_at).toLocaleString('pt-BR')}
                </div>
                <div class="content">
                    <strong>Resumo das Atividades:</strong>
                    <p>${report.summary}</p>
                </div>
                ${report.notes ? `<div class="notes"><strong>Observações:</strong><br>${report.notes}</div>` : ''}
                <div class="footer">
                    Gerado pelo Operium em ${new Date().toLocaleString('pt-BR')}
                </div>
            </body>
            </html>
        `

        // Open print dialog which allows saving as PDF
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(content)
            printWindow.document.close()
            printWindow.focus()
            setTimeout(() => {
                printWindow.print()
            }, 250)
        }
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                {/* Tipo de relatório */}
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tipo</label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'INDIVIDUAL' | 'TEAM')}
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                    >
                        <option value="ALL">Todos</option>
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="TEAM">Equipe</option>
                    </select>
                </div>

                {/* Equipe */}
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

                {/* Data */}
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
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    className="w-full pl-9 pr-4 py-2.5 bg-transparent border-b border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-zinc-400 transition-colors"
                />
            </div>

            {/* Results count */}
            <div className="text-sm text-zinc-500">
                {filteredReports.length} relatório{filteredReports.length !== 1 ? 's' : ''} encontrado{filteredReports.length !== 1 ? 's' : ''}
            </div>

            {/* List */}
            <div className="space-y-4">
                {paginatedReports.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        Nenhum relatório encontrado para os filtros selecionados.
                    </div>
                ) : (
                    paginatedReports.map(report => (
                        <div
                            key={report.id}
                            className="group p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
                        >
                            {/* Header: Author, Team, Type, Timestamp */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {report.user_name}
                                        </h3>
                                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                        {/* Badge de tipo */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${
                                            report.report_type === 'INDIVIDUAL'
                                                ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
                                                : 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900'
                                        }`}>
                                            {report.report_type === 'INDIVIDUAL' ? (
                                                <><User className="h-3 w-3" /> Individual</>
                                            ) : (
                                                <><Users className="h-3 w-3" /> Equipe</>
                                            )}
                                        </span>
                                        <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                        <span className={`px-2 py-0.5 text-xs rounded border ${report.team_deleted
                                            ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900'
                                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                            }`}>
                                            {report.team_name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        {new Date(report.report_date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} — {new Date(report.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleExportPDF(report)}
                                    className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
                                    title="Exportar relatório"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Body: Report content */}
                            <div className="mt-3 space-y-2">
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                    {report.summary}
                                </p>
                                {report.notes && (
                                    <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 py-1">
                                        {report.notes}
                                    </p>
                                )}
                            </div>

                            {/* Footer: Document type tags (audit-like) */}
                            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
                                    Registro de Campo
                                </span>
                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
                                    Relatório Diário
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm text-zinc-500">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = currentPage - 2 + i
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${currentPage === pageNum
                                            ? 'bg-zinc-900 text-white'
                                            : 'text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
