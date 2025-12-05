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
    const [step, setStep] = useState<"upload" | "camera" | "processing" | "review">("upload")
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

    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            setIsCameraOpen(true)
            setStep("camera")
        } catch (err) {
            console.error("Erro ao acessar câmera:", err)
            setError("Não foi possível acessar a câmera. Verifique as permissões.")
        }
    }

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
            videoRef.current.srcObject = null
        }
        setIsCameraOpen(false)
        setStep("upload")
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            const context = canvas.getContext("2d")

            if (context) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                context.drawImage(video, 0, 0, canvas.width, canvas.height)

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
                        setFile(file)
                        setPreviewUrl(URL.createObjectURL(file))
                        stopCamera()
                        processImage(file)
                    }
                }, "image/jpeg", 0.9)
            }
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
                        onClick={() => {
                            if (isCameraOpen) stopCamera()
                            onClose()
                        }}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col items-center justify-center gap-4 h-64"
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-slate-900 dark:text-white">
                                                Fazer Upload
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Arraste ou clique para selecionar
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={startCamera}
                                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col items-center justify-center gap-4 h-64"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium text-slate-900 dark:text-white">
                                                Usar Câmera
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                Tirar foto agora
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        {error}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === "camera" && (
                            <motion.div
                                key="camera"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center h-full"
                            >
                                <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden mb-6">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={stopCamera}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700">
                                        <Camera className="w-4 h-4 mr-2" />
                                        Capturar Foto
                                    </Button>
                                </div>
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
                    <Button variant="outline" onClick={() => {
                        if (isCameraOpen) stopCamera()
                        onClose()
                    }}>
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
