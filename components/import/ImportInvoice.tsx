"use client"

import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Upload,
    Camera,
    X,
    Check,
    AlertCircle,
    Loader2,
    Trash2,
    Plus
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"

export interface ExtractedItem {
    nome: string
    quantidade: number
    valor_unitario?: number
    codigo?: string
    categoria?: string
    unidade?: string
}

interface ImportInvoiceProps {
    onImport: (items: ExtractedItem[]) => Promise<void>
    onClose: () => void
}

export default function ImportInvoice({ onImport, onClose }: ImportInvoiceProps) {
    const { t } = useTranslation()
    const [step, setStep] = useState<"upload" | "processing" | "review">("upload")
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [items, setItems] = useState<ExtractedItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const processImage = async (file: File) => {
        setStep("processing")
        setError(null)

        try {
            // Converter para base64
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = async () => {
                const base64Image = reader.result as string

                const res = await fetch("/api/ai/ocr", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: base64Image })
                })

                if (!res.ok) throw new Error("Erro ao processar imagem")

                const data = await res.json()
                if (data.items && Array.isArray(data.items)) {
                    setItems(data.items)
                    setStep("review")
                } else {
                    throw new Error("Formato de resposta inválido")
                }
            }
        } catch (err) {
            console.error(err)
            setError("Não foi possível ler a nota fiscal. Tente novamente com uma imagem mais clara.")
            setStep("upload")
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setPreviewUrl(URL.createObjectURL(selectedFile))
            processImage(selectedFile)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.type.startsWith("image/")) {
            setFile(droppedFile)
            setPreviewUrl(URL.createObjectURL(droppedFile))
            processImage(droppedFile)
        }
    }

    const updateItem = (index: number, field: keyof ExtractedItem, value: any) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const addItem = () => {
        setItems([...items, { nome: "", quantidade: 1 }])
    }

    const handleConfirm = async () => {
        try {
            await onImport(items)
            onClose()
        } catch (err) {
            console.error(err)
            setError("Erro ao salvar itens.")
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Camera className="w-6 h-6 text-blue-500" />
                            Importar Nota Fiscal (IA)
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Tire uma foto da nota e deixe a IA extrair os itens.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <AnimatePresence mode="wait">
                        {step === "upload" && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                                    <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                                        Arraste uma imagem ou clique para selecionar
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        Suporta JPG, PNG
                                    </p>
                                </div>
                                {error && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        {error}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === "processing" && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-12"
                            >
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                <p className="text-lg font-medium text-slate-900 dark:text-white">
                                    Lendo Nota Fiscal...
                                </p>
                                <p className="text-slate-500 dark:text-slate-400">
                                    A IA está identificando os produtos, códigos e categorias.
                                </p>
                            </motion.div>
                        )}

                        {step === "review" && (
                            <motion.div
                                key="review"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex gap-4 flex-col lg:flex-row">
                                    {previewUrl && (
                                        <div className="w-full lg:w-1/3 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-64 lg:h-auto min-h-[200px]">
                                            <Image
                                                src={previewUrl}
                                                alt="Preview"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold">Itens Identificados</h3>
                                            <Button size="sm" variant="outline" onClick={addItem}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Adicionar Item
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-700">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Produto</th>
                                                        <th className="px-4 py-2 text-left w-24">Código</th>
                                                        <th className="px-4 py-2 text-left w-32">Categoria</th>
                                                        <th className="px-4 py-2 text-left w-20">Unid.</th>
                                                        <th className="px-4 py-2 text-left w-20">Qtd</th>
                                                        <th className="px-4 py-2 text-left w-24">Valor (R$)</th>
                                                        <th className="px-4 py-2 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {items.map((item, i) => (
                                                        <tr key={i}>
                                                            <td className="p-2">
                                                                <Input
                                                                    value={item.nome}
                                                                    onChange={(e) => updateItem(i, "nome", e.target.value)}
                                                                    className="h-8"
                                                                    placeholder="Nome do produto"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    value={item.codigo || ""}
                                                                    onChange={(e) => updateItem(i, "codigo", e.target.value)}
                                                                    className="h-8"
                                                                    placeholder="Código"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    value={item.categoria || ""}
                                                                    onChange={(e) => updateItem(i, "categoria", e.target.value)}
                                                                    className="h-8"
                                                                    placeholder="Categoria"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    value={item.unidade || ""}
                                                                    onChange={(e) => updateItem(i, "unidade", e.target.value)}
                                                                    className="h-8"
                                                                    placeholder="UN"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    type="number"
                                                                    value={item.quantidade}
                                                                    onChange={(e) => updateItem(i, "quantidade", Number(e.target.value))}
                                                                    className="h-8"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={item.valor_unitario || ""}
                                                                    onChange={(e) => updateItem(i, "valor_unitario", Number(e.target.value))}
                                                                    className="h-8"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <button
                                                                    onClick={() => removeItem(i)}
                                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    {step === "review" && (
                        <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700">
                            <Check className="w-4 h-4 mr-2" />
                            Confirmar Importação
                        </Button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}
