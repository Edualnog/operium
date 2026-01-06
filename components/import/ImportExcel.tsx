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
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react"
import { useTranslation } from "react-i18next"

export interface ColumnMapping {
  excelColumn: string
  dbColumn: string
  label: string
  required: boolean
  type?: "text" | "number" | "date" | "select"
  options?: string[] // Para campos select
}

export interface ImportConfig {
  title: string
  description: string
  templateFileName: string
  columns: ColumnMapping[]
  onImport: (data: Record<string, any>[]) => Promise<{ success: number; errors: string[] }>
}

interface ImportExcelProps {
  config: ImportConfig
  onClose: () => void
}

export default function ImportExcel({ config, onClose }: ImportExcelProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "result">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [rawData, setRawData] = useState<Record<string, any>[]>([])
  const [mappedData, setMappedData] = useState<Record<string, any>[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showAllRows, setShowAllRows] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Gerar template de planilha
  const downloadTemplate = useCallback(() => {
    const headers = config.columns.map(col => col.label)
    const exampleRow = config.columns.map(col => {
      if (col.type === "number") return "0"
      if (col.type === "date") return "2024-01-01"
      if (col.options) return col.options[0]
      return `${t("import.example")} ${col.label}`
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t("import.data_sheet_name"))

    // Ajustar largura das colunas
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 5, 15) }))
    ws["!cols"] = colWidths

    XLSX.writeFile(wb, config.templateFileName)
  }, [config, t])

  // Processar arquivo
  const processFile = useCallback((file: File) => {
    setFile(file)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array", cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false })

        if (jsonData.length === 0) {
          setErrors([t("import.errors.empty_sheet")])
          return
        }

        setRawData(jsonData)

        // Mapear dados
        const mapped = jsonData.map((row, rowIndex) => {
          const mappedRow: Record<string, any> = {}
          const rowErrors: string[] = []

          config.columns.forEach(col => {
            // Tentar encontrar a coluna pelo label ou pelo nome da coluna do Excel
            let value = row[col.label] ?? row[col.excelColumn] ?? ""

            // Validar campos obrigatórios
            if (col.required && (!value || value.toString().trim() === "")) {
              rowErrors.push(t("import.errors.required_field", { row: rowIndex + 2, field: col.label }))
            }

            // Converter tipos
            if (col.type === "number" && value) {
              const num = parseFloat(value.toString().replace(",", "."))
              value = isNaN(num) ? 0 : num
            }

            if (col.type === "date" && value) {
              // Tentar converter para data
              const date = new Date(value)
              if (!isNaN(date.getTime())) {
                value = date.toISOString().split("T")[0]
              }
            }

            // Validar opções (select)
            if (col.options && value && !col.options.includes(value.toString())) {
              rowErrors.push(t("import.errors.invalid_value", { row: rowIndex + 2, value, field: col.label, options: col.options.join(", ") }))
            }

            mappedRow[col.dbColumn] = value
          })

          if (rowErrors.length > 0) {
            setErrors(prev => [...prev, ...rowErrors])
          }

          return mappedRow
        })

        setMappedData(mapped)
        setStep("preview")
      } catch (error) {
        console.error("Erro ao processar arquivo:", error)
        setErrors([t("import.errors.process_error")])
      }
    }

    reader.readAsArrayBuffer(file)
  }, [config, t])

  // Handlers de drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls") || droppedFile.name.endsWith(".csv"))) {
      processFile(droppedFile)
    } else {
      setErrors([t("import.errors.invalid_file_type")])
    }
  }, [processFile, t])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setErrors([])
      processFile(selectedFile)
    }
  }, [processFile])

  // Remover linha do preview
  const removeRow = useCallback((index: number) => {
    setMappedData(prev => prev.filter((_, i) => i !== index))
    setRawData(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Executar importação
  const executeImport = useCallback(async () => {
    setStep("importing")
    setErrors([])

    try {
      const result = await config.onImport(mappedData)
      setImportResult(result)
      setStep("result")
    } catch (error) {
      console.error("Erro na importação:", error)
      setErrors([t("import.errors.process_error")])
      setStep("preview")
    }
  }, [config, mappedData, t])

  // Reset
  const reset = useCallback(() => {
    setStep("upload")
    setFile(null)
    setRawData([])
    setMappedData([])
    setErrors([])
    setImportResult(null)
    setShowAllRows(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const displayedRows = showAllRows ? mappedData : mappedData.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[85vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">
              {config.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              {config.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <AnimatePresence mode="wait">
            {/* Step: Upload */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Download Template */}
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {t("import.download_template.title")}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t("import.download_template.description")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t("import.download_template.button")}
                  </button>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                    ${isDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-blue-500" : "text-slate-400"}`} />
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    {t("import.drag_drop.title")}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {t("import.drag_drop.subtitle")}
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                    {t("import.drag_drop.formats")}
                  </p>
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">{t("import.errors.title")}</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                      {errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Campos esperados */}
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p className="font-medium text-slate-900 dark:text-white mb-3">
                    {t("import.expected_fields")}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {config.columns.map(col => (
                      <div
                        key={col.dbColumn}
                        className={`px-3 py-2 rounded-lg text-sm ${col.required
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                          }`}
                      >
                        {col.label}
                        {col.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {t("import.required_fields_note")}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step: Preview */}
            {step === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* File info */}
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {file?.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t("import.preview.records_found_plural", { count: mappedData.length })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {t("import.preview.change_file")}
                  </button>
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">{t("import.preview.warnings", { count: errors.length })}</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 space-y-1 max-h-32 overflow-auto">
                      {errors.slice(0, 10).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {errors.length > 10 && (
                        <li>{t("import.preview.more_warnings", { count: errors.length - 10 })}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Preview Table */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 w-12">
                            #
                          </th>
                          {config.columns.map(col => (
                            <th
                              key={col.dbColumn}
                              className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
                            >
                              {col.label}
                            </th>
                          ))}
                          <th className="px-4 py-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {displayedRows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                            {config.columns.map(col => (
                              <td
                                key={col.dbColumn}
                                className="px-4 py-3 text-slate-900 dark:text-white whitespace-nowrap"
                              >
                                {row[col.dbColumn]?.toString() || "-"}
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <button
                                onClick={() => removeRow(i)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Show more */}
                  {mappedData.length > 5 && (
                    <button
                      onClick={() => setShowAllRows(!showAllRows)}
                      className="w-full py-3 text-sm text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-center gap-2"
                    >
                      {showAllRows ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          {t("import.preview.show_less")}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          {t("import.preview.show_more", { count: mappedData.length - 5 })}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step: Importing */}
            {step === "importing" && (
              <motion.div
                key="importing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                  {t("import.importing.title")}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {t("import.importing.description", { count: mappedData.length })}
                </p>
              </motion.div>
            )}

            {/* Step: Result */}
            {step === "result" && importResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Success */}
                {importResult.success > 0 && (
                  <div className="flex items-center gap-4 p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-green-700 dark:text-green-300">
                        {t("import.result.success_plural", { count: importResult.success })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">
                        {t("import.result.errors_plural", { count: importResult.errors.length })}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1 max-h-48 overflow-auto">
                      {importResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          {step === "upload" && (
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t("dashboard.ferramentas.form.cancel")}
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={reset}
                className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors order-2 sm:order-1"
              >
                {t("import.actions.back")}
              </button>
              <button
                onClick={executeImport}
                disabled={mappedData.length === 0}
                className="w-full sm:w-auto px-6 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                <Upload className="w-4 h-4" />
                {t("import.actions.import_count_plural", { count: mappedData.length })}
              </button>
            </>
          )}

          {step === "result" && (
            <>
              <button
                onClick={reset}
                className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors order-2 sm:order-1"
              >
                {t("import.actions.import_more")}
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors order-1 sm:order-2"
              >
                {t("import.actions.finish")}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

