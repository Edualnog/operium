"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { createClientComponentClient } from "@/lib/supabase-client"
import { DATASETS, DatasetConfig, exportToCSV } from "@/lib/export/datasets"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Download, Database, Calendar, Filter, Loader2, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"

export function ExportCenter() {
    const { t } = useTranslation('common')
    const supabase = createClientComponentClient()

    const [selectedDataset, setSelectedDataset] = useState<DatasetConfig | null>(null)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [filters, setFilters] = useState<Record<string, string>>({})
    const [preview, setPreview] = useState<any[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)

    // Fetch preview when dataset or filters change
    useEffect(() => {
        if (selectedDataset) {
            fetchPreview()
        }
    }, [selectedDataset, startDate, endDate, filters]) // eslint-disable-line react-hooks/exhaustive-deps

    const buildQuery = (forCount = false) => {
        if (!selectedDataset) return null

        let query = supabase
            .from(selectedDataset.table)
            .select(forCount ? '*' : selectedDataset.columns.join(','), { count: forCount ? 'exact' : undefined, head: forCount })

        // Date filters
        if (selectedDataset.dateColumn) {
            if (startDate) {
                query = query.gte(selectedDataset.dateColumn, startDate)
            }
            if (endDate) {
                query = query.lte(selectedDataset.dateColumn, endDate + 'T23:59:59')
            }
        }

        // Custom filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                query = query.eq(key, value)
            }
        })

        return query
    }

    const fetchPreview = async () => {
        if (!selectedDataset) return

        setLoading(true)
        try {
            // Fetch count
            const countQuery = buildQuery(true)
            const { count } = await countQuery!
            setTotalCount(count || 0)

            // Fetch preview (first 10)
            const previewQuery = buildQuery(false)
            const { data, error } = await previewQuery!
                .order(selectedDataset.dateColumn || 'created_at', { ascending: false })
                .limit(10)

            if (error) throw error
            setPreview(data || [])
        } catch (error: any) {
            console.error(error)
            toast.error(t('export.error_loading'))
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async () => {
        if (!selectedDataset) return

        setExporting(true)
        try {
            const query = buildQuery(false)
            const { data, error } = await query!
                .order(selectedDataset.dateColumn || 'created_at', { ascending: false })
                .limit(10000) // Safety limit

            if (error) throw error
            if (!data || data.length === 0) {
                toast.error(t('export.no_data'))
                return
            }

            exportToCSV(data, selectedDataset.id)
            toast.success(t('export.success', { count: data.length }))
        } catch (error: any) {
            console.error(error)
            toast.error(t('export.error_exporting'))
        } finally {
            setExporting(false)
        }
    }

    const handleDatasetChange = (datasetId: string) => {
        const dataset = DATASETS.find(d => d.id === datasetId)
        setSelectedDataset(dataset || null)
        setFilters({})
        setPreview([])
        setTotalCount(0)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{t('export.title')}</h1>
                    <p className="text-sm text-zinc-500">{t('export.description')}</p>
                </div>
            </div>

            {/* Dataset Selection */}
            <div className="grid gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <Database className="w-4 h-4" />
                    {t('export.select_dataset')}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DATASETS.map(dataset => (
                        <Button
                            key={dataset.id}
                            variant={selectedDataset?.id === dataset.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleDatasetChange(dataset.id)}
                            className={selectedDataset?.id === dataset.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        >
                            {t(dataset.labelKey)}
                        </Button>
                    ))}
                </div>
            </div>

            {selectedDataset && (
                <>
                    {/* Filters */}
                    <div className="grid gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            <Filter className="w-4 h-4" />
                            {t('export.filters')}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Date Range */}
                            {selectedDataset.dateColumn && (
                                <>
                                    <div className="grid gap-2">
                                        <Label className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {t('export.start_date')}
                                        </Label>
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {t('export.end_date')}
                                        </Label>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Custom Filters */}
                            {selectedDataset.filters?.map(filter => (
                                <div key={filter.key} className="grid gap-2">
                                    <Label>{t(filter.labelKey)}</Label>
                                    <Select
                                        value={filters[filter.key] || 'all'}
                                        onValueChange={(value) => setFilters(prev => ({ ...prev, [filter.key]: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('export.all')}</SelectItem>
                                            {filter.options?.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {t(opt.labelKey)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{t('export.preview')}</span>
                                {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
                            </div>
                            <span className="text-sm text-zinc-500">
                                {t('export.total_records', { count: totalCount })}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {selectedDataset.columns.slice(0, 6).map(col => (
                                            <TableHead key={col} className="whitespace-nowrap">
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                                                {loading ? t('common.loading') : t('export.no_data_preview')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        preview.map((row, i) => (
                                            <TableRow key={i}>
                                                {selectedDataset.columns.slice(0, 6).map(col => (
                                                    <TableCell key={col} className="max-w-[200px] truncate">
                                                        {row[col]?.toString() || '-'}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Export Button */}
                    <div className="flex justify-end gap-2">
                        <Button
                            size="lg"
                            onClick={handleExport}
                            disabled={exporting || totalCount === 0}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {t('export.download_csv')}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}
