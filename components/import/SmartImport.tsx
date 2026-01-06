"use client"

import { useState, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
import { motion, AnimatePresence } from "framer-motion"
import {
    Upload,
    FileSpreadsheet,
    X,
    Check,
    AlertCircle,
    Loader2,
    ChevronDown,
    Sparkles,
    ArrowRight
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/toast-context"

interface ColumnMapping {
    excelColumn: string
    dbColumn: string
    label: string
    confidence: "high" | "medium" | "low"
    required: boolean
}

interface TargetColumn {
    dbColumn: string
    label: string
    required: boolean
}

interface SmartImportProps {
    open: boolean
    onClose: () => void
    onImport: (data: Record<string, any>[]) => Promise<{ success: number; errors: string[] }>
    entityType?: "products" | "collaborators"
    requiredFields?: string[]
    title?: string
}

export default function SmartImport({ open, onClose, onImport, entityType = "products", requiredFields = ["nome"], title }: SmartImportProps) {
    const { t } = useTranslation()
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // States
    const [step, setStep] = useState<"upload" | "mapping" | "importing">("upload")
    const [file, setFile] = useState<File | null>(null)
    const [headers, setHeaders] = useState<string[]>([])
    const [allRows, setAllRows] = useState<any[][]>([])
    const [sampleRows, setSampleRows] = useState<any[][]>([])
    const [mappings, setMappings] = useState<ColumnMapping[]>([])
    const [targetColumns, setTargetColumns] = useState<TargetColumn[]>([])
    const [warnings, setWarnings] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)

    // Reset state when dialog closes
    const handleClose = () => {
        setStep("upload")
        setFile(null)
        setHeaders([])
        setAllRows([])
        setSampleRows([])
        setMappings([])
        setWarnings([])
        setImportResult(null)
        onClose()
    }

    // Handle file selection
    const handleFileSelect = useCallback(async (selectedFile: File) => {
        setFile(selectedFile)
        setLoading(true)

        try {
            const data = await selectedFile.arrayBuffer()
            const workbook = XLSX.read(data, { type: "array" })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

            if (jsonData.length < 2) {
                throw new Error("Planilha precisa ter pelo menos um cabeçalho e uma linha de dados")
            }

            const fileHeaders = jsonData[0].map((h: any) => String(h || "").trim())
            const fileRows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ""))

            setHeaders(fileHeaders)
            setAllRows(fileRows)
            setSampleRows(fileRows.slice(0, 5))

            // Call AI to infer column mappings
            const response = await fetch("/api/ai/infer-columns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    headers: fileHeaders,
                    sampleRows: fileRows.slice(0, 5),
                    entityType
                })
            })

            if (!response.ok) {
                throw new Error("Erro ao analisar planilha")
            }

            const result = await response.json()
            setMappings(result.mappings || [])
            setTargetColumns(result.targetColumns || [])
            setWarnings(result.warnings || [])
            setStep("mapping")

        } catch (error: any) {
            console.error("Erro ao processar arquivo:", error)
            toast.error(error.message || "Erro ao processar arquivo")
            setFile(null)
        } finally {
            setLoading(false)
        }
    }, [toast, entityType])

    // Handle file drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv'))) {
            handleFileSelect(droppedFile)
        } else {
            toast.error("Formato inválido. Use .xlsx, .xls ou .csv")
        }
    }, [handleFileSelect, toast])

    // Handle mapping change
    const handleMappingChange = (excelColumn: string, newDbColumn: string) => {
        setMappings(prev => prev.map(m =>
            m.excelColumn === excelColumn
                ? { ...m, dbColumn: newDbColumn, label: targetColumns.find(t => t.dbColumn === newDbColumn)?.label || newDbColumn }
                : m
        ))
    }

    // Process import
    const handleImport = async () => {
        setStep("importing")
        setLoading(true)

        try {
            // Build mapped data
            const mappedData: Record<string, any>[] = allRows.map(row => {
                const obj: Record<string, any> = {}
                mappings.forEach((mapping, index) => {
                    if (mapping.dbColumn !== "ignore") {
                        const value = row[headers.indexOf(mapping.excelColumn)]
                        if (value !== undefined && value !== null && value !== "") {
                            obj[mapping.dbColumn] = value
                        }
                    }
                })
                return obj
            }).filter(obj => Object.keys(obj).length > 0)

            // Call the import function
            const result = await onImport(mappedData)
            setImportResult(result)

            if (result.success > 0) {
                toast.success(`${result.success} itens importados com sucesso!`)
            }
            if (result.errors.length > 0) {
                toast.error(`${result.errors.length} erros durante a importação`)
            }

        } catch (error: any) {
            console.error("Erro na importação:", error)
            toast.error(error.message || "Erro na importação")
            setImportResult({ success: 0, errors: [error.message || "Erro desconhecido"] })
        } finally {
            setLoading(false)
        }
    }

    // Get confidence badge color
    const getConfidenceBadge = (confidence: string) => {
        switch (confidence) {
            case "high":
                return <Badge className="bg-green-500/10 text-green-600 border-green-200">Alta</Badge>
            case "medium":
                return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Média</Badge>
            case "low":
                return <Badge className="bg-red-500/10 text-red-600 border-red-200">Baixa</Badge>
            default:
                return null
        }
    }

    // Check if required mappings are present
    const hasRequiredMappings = () => {
        const mappedDbColumns = mappings.filter(m => m.dbColumn !== "ignore").map(m => m.dbColumn)
        return requiredFields.every(field => mappedDbColumns.includes(field))
    }

    const getRequiredFieldsLabel = () => {
        return requiredFields.join(", ")
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[85vw] md:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-3 sm:p-6">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        {title || "Importação Inteligente"}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        {step === "upload" && "Faça upload de qualquer planilha. A IA irá identificar as colunas automaticamente."}
                        {step === "mapping" && "Verifique o mapeamento das colunas detectado pela IA."}
                        {step === "importing" && "Processando a importação..."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Upload */}
                        {step === "upload" && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-6 sm:p-12 text-center cursor-pointer transition-all",
                                        "hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                                        loading ? "pointer-events-none opacity-50" : "border-zinc-300 dark:border-zinc-700"
                                    )}
                                >
                                    {loading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-12 w-12 text-zinc-400 animate-spin" />
                                            <p className="text-zinc-500 text-sm sm:text-base">Analisando planilha com IA...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                                                <Upload className="h-8 w-8 text-zinc-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-zinc-700 dark:text-zinc-300 text-sm sm:text-base">
                                                    Arraste sua planilha aqui
                                                </p>
                                                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                                                    ou clique para selecionar • .xlsx, .xls, .csv
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0]
                                        if (f) handleFileSelect(f)
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Step 2: Mapping */}
                        {step === "mapping" && (
                            <motion.div
                                key="mapping"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* File info */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                    <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{file?.name}</p>
                                        <p className="text-xs text-zinc-500">{allRows.length} linhas detectadas</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setStep("upload")} className="w-full sm:w-auto text-xs">
                                        Trocar arquivo
                                    </Button>
                                </div>

                                {/* Warnings */}
                                {warnings.length > 0 && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                            <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                                                {warnings.map((w, i) => <p key={i}>{w}</p>)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mapping table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-zinc-50 dark:bg-zinc-800">
                                                    <TableHead className="min-w-[150px] text-xs sm:text-sm">Coluna da Planilha</TableHead>
                                                    <TableHead className="min-w-[80px] text-xs sm:text-sm">Confiança</TableHead>
                                                    <TableHead className="w-[30px]"></TableHead>
                                                    <TableHead className="min-w-[200px] text-xs sm:text-sm">Mapeia para</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {mappings.map((mapping, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium text-xs sm:text-sm">{mapping.excelColumn}</TableCell>
                                                        <TableCell>{getConfidenceBadge(mapping.confidence)}</TableCell>
                                                        <TableCell>
                                                            <ArrowRight className="h-4 w-4 text-zinc-400" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={mapping.dbColumn}
                                                                onValueChange={(v) => handleMappingChange(mapping.excelColumn, v)}
                                                            >
                                                                <SelectTrigger className="w-full min-w-[150px] sm:w-[250px] text-xs sm:text-sm">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="ignore">
                                                                        <span className="text-zinc-400">— Ignorar esta coluna —</span>
                                                                    </SelectItem>
                                                                    {targetColumns.map(col => (
                                                                        <SelectItem key={col.dbColumn} value={col.dbColumn}>
                                                                            {col.label} {col.required && <span className="text-red-500">*</span>}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="space-y-2">
                                    <p className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview (primeiras 5 linhas)</p>
                                    <div className="border rounded-lg overflow-x-auto max-h-[200px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-zinc-50 dark:bg-zinc-800">
                                                    {headers.map((h, i) => (
                                                        <TableHead key={i} className="text-xs whitespace-nowrap">{h}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sampleRows.map((row, i) => (
                                                    <TableRow key={i}>
                                                        {headers.map((_, j) => (
                                                            <TableCell key={j} className="text-xs py-2 whitespace-nowrap">
                                                                {row[j] ?? ""}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Importing */}
                        {step === "importing" && (
                            <motion.div
                                key="importing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col items-center justify-center py-12 space-y-4"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-12 w-12 text-zinc-400 animate-spin" />
                                        <p className="text-zinc-500 text-sm sm:text-base">Importando {allRows.length} itens...</p>
                                    </>
                                ) : importResult ? (
                                    <div className="text-center space-y-4 w-full">
                                        {importResult.success > 0 && (
                                            <div className="flex items-center justify-center gap-2 text-green-600">
                                                <Check className="h-6 w-6" />
                                                <span className="text-base sm:text-lg font-medium">{importResult.success} itens importados</span>
                                            </div>
                                        )}
                                        {importResult.errors.length > 0 && (
                                            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg max-h-[200px] overflow-y-auto">
                                                <p className="font-medium text-red-600 mb-2 text-sm sm:text-base">{importResult.errors.length} erros:</p>
                                                <ul className="text-xs sm:text-sm text-red-600 space-y-1 text-left">
                                                    {importResult.errors.slice(0, 10).map((e, i) => (
                                                        <li key={i}>{e}</li>
                                                    ))}
                                                    {importResult.errors.length > 10 && (
                                                        <li>... e mais {importResult.errors.length - 10} erros</li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                        <Button onClick={handleClose} className="mt-4 w-full sm:w-auto">
                                            Fechar
                                        </Button>
                                    </div>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer actions */}
                {step === "mapping" && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto order-2 sm:order-1">
                            Cancelar
                        </Button>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-1 sm:order-2">
                            {!hasRequiredMappings() && (
                                <p className="text-xs sm:text-sm text-amber-600 text-center sm:text-left">
                                    <AlertCircle className="h-4 w-4 inline mr-1" />
                                    Campos obrigatórios: {getRequiredFieldsLabel()}
                                </p>
                            )}
                            <Button
                                onClick={handleImport}
                                disabled={!hasRequiredMappings() || loading}
                                className="gap-2 w-full sm:w-auto"
                            >
                                <Check className="h-4 w-4" />
                                <span className="text-xs sm:text-sm">Confirmar e Importar ({allRows.length} itens)</span>
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
