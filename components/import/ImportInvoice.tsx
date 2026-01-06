"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Upload,
    Camera,
    X,
    Check,
    AlertCircle,
    Loader2,
    Trash2,
    Plus,
    RotateCw,
    Repeat
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
    const { t } = useTranslation('common')
    const [step, setStep] = useState<"upload" | "camera" | "processing" | "review">("upload")
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [items, setItems] = useState<ExtractedItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = document.createElement("img")
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement("canvas")
                    let width = img.width
                    let height = img.height

                    // Aumentar tamanho máximo para manter mais detalhes
                    const MAX_SIZE = 2048  // Aumentado de 1024 para 2048
                    if (width > MAX_SIZE || height > MAX_SIZE) {
                        if (width > height) {
                            height *= MAX_SIZE / width
                            width = MAX_SIZE
                        } else {
                            width *= MAX_SIZE / height
                            height = MAX_SIZE
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext("2d")

                    // Melhorar qualidade da renderização
                    if (ctx) {
                        ctx.imageSmoothingEnabled = true
                        ctx.imageSmoothingQuality = 'high'
                        ctx.drawImage(img, 0, 0, width, height)
                    }

                    // Aumentar qualidade de compressão de 0.7 para 0.92
                    const base64 = canvas.toDataURL("image/jpeg", 0.92)
                    resolve(base64)
                }
                img.onerror = (err) => reject(err)
            }
            reader.onerror = (err) => reject(err)
        })
    }

    const processImage = async (file: File) => {
        setStep("processing")
        setError(null)

        try {
            // Comprimir imagem antes de enviar
            const base64Image = await compressImage(file)

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
        } catch (err) {
            console.error(err)
            setError(t('import_invoice.error_reading'))
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
            setError(t('import_invoice.error_saving'))
        }
    }

    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Função auxiliar para parar tracks atuais
    const stopTracks = () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop())
            setMediaStream(null)
        }
    }

    const startCamera = async (mode: "user" | "environment" = facingMode) => {
        try {
            stopTracks()

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode }
            })
            setMediaStream(stream)
            setIsCameraOpen(true)
            setStep("camera")
        } catch (err) {
            console.error("Erro ao acessar câmera:", err)
            setError(t('import_invoice.error_camera'))
        }
    }

    const toggleCamera = () => {
        const newMode = facingMode === "environment" ? "user" : "environment"
        setFacingMode(newMode)
        startCamera(newMode)
    }

    const stopCamera = useCallback(() => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop())
            setMediaStream(null)
        }
        setIsCameraOpen(false)
        if (step === "camera") {
            setStep("upload")
        }
    }, [mediaStream, step])

    // Callback ref para garantir que o vídeo inicie assim que montado
    const onVideoMount = useCallback((node: HTMLVideoElement | null) => {
        videoRef.current = node
        if (node && mediaStream) {
            node.srcObject = mediaStream
            node.play().catch(e => console.error("Erro ao iniciar vídeo:", e))
        }
    }, [mediaStream])

    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [mediaStream])

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
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    stopCamera()
                    onClose()
                }
            }}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-none md:rounded-2xl shadow-2xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Camera className="w-5 h-5 md:w-6 md:h-6 text-zinc-600 dark:text-zinc-400" />
                            {t('import_invoice.title')}
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            {t('import_invoice.subtitle')}
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
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <AnimatePresence mode="wait">
                        {step === "upload" && (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6 h-full flex flex-col justify-center md:block"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 md:p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col items-center justify-center gap-4 h-48 md:h-64"
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                                            <Upload className="w-6 h-6 md:w-8 md:h-8" />
                                        </div>
                                        <div>
                                            <p className="text-base md:text-lg font-medium text-slate-900 dark:text-white">
                                                {t('import_invoice.upload')}
                                            </p>
                                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                                {t('import_invoice.upload_hint')}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => startCamera()}
                                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 md:p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col items-center justify-center gap-4 h-48 md:h-64"
                                    >
                                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                                            <Camera className="w-6 h-6 md:w-8 md:h-8" />
                                        </div>
                                        <div>
                                            <p className="text-base md:text-lg font-medium text-slate-900 dark:text-white">
                                                {t('import_invoice.use_camera_title')}
                                            </p>
                                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                                {t('import_invoice.use_camera_hint')}
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
                                        ref={onVideoMount}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="outline" onClick={toggleCamera} title="Inverter Câmera">
                                        <Repeat className="w-4 h-4 mr-2" />
                                        {t('import_invoice.flip_camera')}
                                    </Button>
                                    <Button variant="outline" onClick={stopCamera}>
                                        {t('import_invoice.cancel')}
                                    </Button>
                                    <Button onClick={capturePhoto} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                                        <Camera className="w-4 h-4 mr-2" />
                                        {t('import_invoice.capture')}
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
                                className="flex flex-col items-center justify-center py-12 h-full"
                            >
                                <Loader2 className="w-12 h-12 text-zinc-500 animate-spin mb-4" />
                                <p className="text-lg font-medium text-slate-900 dark:text-white">
                                    {t('import_invoice.processing')}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400">
                                    {t('import_invoice.processing_hint')}
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
                                        <div className="w-full lg:w-1/3 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-48 md:h-64 lg:h-auto min-h-[200px]">
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
                                            <h3 className="font-semibold">{t('import_invoice.identified_items')}</h3>
                                            <Button size="sm" variant="outline" onClick={addItem}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                {t('import_invoice.add_item')}
                                            </Button>
                                        </div>

                                        <div className="border rounded-lg overflow-x-auto">
                                            <table className="w-full text-sm min-w-[600px]">
                                                <thead className="bg-slate-50 dark:bg-slate-700">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">{t('import_invoice.product')}</th>
                                                        <th className="px-4 py-2 text-left w-24">{t('import_invoice.code')}</th>
                                                        <th className="px-4 py-2 text-left w-32">{t('import_invoice.category')}</th>
                                                        <th className="px-4 py-2 text-left w-20">{t('import_invoice.unit')}</th>
                                                        <th className="px-4 py-2 text-left w-20">{t('import_invoice.qty')}</th>
                                                        <th className="px-4 py-2 text-left w-24">{t('import_invoice.value')}</th>
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
                                                                    placeholder={t('import_invoice.product_name_placeholder')}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    value={item.codigo || ""}
                                                                    onChange={(e) => updateItem(i, "codigo", e.target.value)}
                                                                    className="h-8"
                                                                    placeholder={t('import_invoice.code_placeholder')}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    value={item.categoria || ""}
                                                                    onChange={(e) => updateItem(i, "categoria", e.target.value)}
                                                                    className="h-8"
                                                                    placeholder={t('import_invoice.category_placeholder')}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <Input
                                                                    value={item.unidade || ""}
                                                                    onChange={(e) => updateItem(i, "unidade", e.target.value)}
                                                                    className="h-8"
                                                                    placeholder={t('import_invoice.unit_placeholder')}
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
                        {t('import_invoice.cancel')}
                    </Button>
                    {step === "review" && (
                        <Button onClick={handleConfirm} className="bg-[#37352f] hover:bg-zinc-800 text-white">
                            <Check className="w-4 h-4 mr-2" />
                            {t('import_invoice.confirm')}
                        </Button>
                    )}
                </div>
            </motion.div>
        </motion.div >
    )
}
