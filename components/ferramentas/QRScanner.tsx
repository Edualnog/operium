"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, SwitchCamera, Loader2, Camera, Upload } from "lucide-react"

interface QRScannerProps {
    onScan: (decodedText: string) => void
    onClose: () => void
    title?: string
    description?: string
}

export function QRScanner({ onScan, onClose, title, description }: QRScannerProps) {
    const [error, setError] = useState<string | null>(null)
    const [isStarting, setIsStarting] = useState(true)
    const [cameraMode, setCameraMode] = useState<"stream" | "file">("stream")
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isClosingRef = useRef(false)
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const stopCamera = useCallback(() => {
        // Clear scan interval
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current)
            scanIntervalRef.current = null
        }
        // Stop all tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        // Clear video
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
    }, [])

    const handleClose = useCallback(() => {
        if (isClosingRef.current) return
        isClosingRef.current = true
        stopCamera()
        onClose()
    }, [onClose, stopCamera])

    const processImage = useCallback(async (imageData: string): Promise<string | null> => {
        try {
            const { Html5Qrcode } = await import("html5-qrcode")
            const scanner = new Html5Qrcode("qr-temp-element")

            // Convert base64 to file
            const response = await fetch(imageData)
            const blob = await response.blob()
            const file = new File([blob], "scan.jpg", { type: "image/jpeg" })

            const result = await scanner.scanFile(file, true)
            await scanner.clear()
            return result
        } catch (e) {
            return null
        }
    }, [])

    const startCamera = useCallback(async (mode: "environment" | "user" = facingMode) => {
        setIsStarting(true)
        setError(null)
        stopCamera()

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: mode } },
                audio: false
            })

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.setAttribute('playsinline', 'true')
                await videoRef.current.play()
            }

            setIsStarting(false)
            setCameraMode("stream")

            // Start frame scanning
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            scanIntervalRef.current = setInterval(async () => {
                if (!videoRef.current || !ctx || isClosingRef.current) return

                const video = videoRef.current
                if (video.readyState < video.HAVE_ENOUGH_DATA) return

                canvas.width = video.videoWidth || 640
                canvas.height = video.videoHeight || 480
                ctx.drawImage(video, 0, 0)

                const imageData = canvas.toDataURL('image/jpeg', 0.8)
                const result = await processImage(imageData)

                if (result) {
                    onScan(result)
                    handleClose()
                }
            }, 500) // Scan every 500ms

        } catch (err: any) {
            console.error("Camera error:", err)
            setIsStarting(false)
            setCameraMode("file")

            // Show fallback file mode
            setError("Não foi possível acessar a câmera. Use o botão abaixo para tirar uma foto.")
        }
    }, [facingMode, stopCamera, onScan, handleClose, processImage])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsStarting(true)
        setError(null)

        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                const imageData = event.target?.result as string
                const result = await processImage(imageData)

                if (result) {
                    onScan(result)
                    handleClose()
                } else {
                    setError("Código não encontrado na imagem. Tente novamente.")
                    setIsStarting(false)
                }
            }
            reader.readAsDataURL(file)
        } catch (err) {
            setError("Erro ao processar imagem.")
            setIsStarting(false)
        }
    }

    const switchCamera = useCallback(() => {
        const newMode = facingMode === "environment" ? "user" : "environment"
        setFacingMode(newMode)
        startCamera(newMode)
    }, [facingMode, startCamera])

    useEffect(() => {
        const timer = setTimeout(() => startCamera(), 200)
        return () => {
            clearTimeout(timer)
            stopCamera()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Hidden elements */}
            <div id="qr-temp-element" style={{ display: 'none' }} />
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-safe bg-black">
                <span className="text-white font-semibold text-lg">
                    {title || "Escanear Código"}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-11 w-11"
                    onClick={handleClose}
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
                {/* Video (only show in stream mode) */}
                {cameraMode === "stream" && (
                    <div className="w-full max-w-sm aspect-square relative rounded-2xl overflow-hidden bg-zinc-900">
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            playsInline
                            autoPlay
                            muted
                        />

                        {/* Scan frame overlay */}
                        <div className="absolute inset-0 pointer-events-none p-4">
                            <div className="relative w-full h-full">
                                <div className="absolute -top-1 -left-1 w-12 h-12 border-l-4 border-t-4 border-green-400 rounded-tl-xl" />
                                <div className="absolute -top-1 -right-1 w-12 h-12 border-r-4 border-t-4 border-green-400 rounded-tr-xl" />
                                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-l-4 border-b-4 border-green-400 rounded-bl-xl" />
                                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-r-4 border-b-4 border-green-400 rounded-br-xl" />
                            </div>
                        </div>
                    </div>
                )}

                {/* File mode fallback */}
                {cameraMode === "file" && !isStarting && (
                    <div className="w-full max-w-sm aspect-square relative rounded-2xl overflow-hidden bg-zinc-800 flex flex-col items-center justify-center p-6">
                        <Camera className="h-20 w-20 text-zinc-600 mb-4" />
                        <p className="text-white text-center mb-6">
                            Toque no botão abaixo para abrir a câmera e tirar uma foto do código
                        </p>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                            <Camera className="h-5 w-5" />
                            Tirar Foto
                        </Button>
                    </div>
                )}

                {/* Loading overlay */}
                {isStarting && (
                    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                        <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
                        <p className="text-white">Iniciando...</p>
                    </div>
                )}

                {/* Description */}
                <p className="mt-6 text-center text-sm text-zinc-400 px-4 max-w-sm">
                    {description || "Posicione o código QR ou de barras no centro do quadro"}
                </p>

                {/* Error message */}
                {error && cameraMode === "stream" && (
                    <div className="mt-4 bg-zinc-800 rounded-lg p-4 max-w-sm">
                        <p className="text-yellow-400 text-sm text-center">{error}</p>
                    </div>
                )}
            </div>

            {/* Bottom actions */}
            <div className="p-4 pb-safe flex flex-col gap-3 bg-black">
                {cameraMode === "stream" && !isStarting && (
                    <div className="flex justify-center gap-3">
                        <Button
                            variant="ghost"
                            className="text-zinc-300 hover:text-white hover:bg-zinc-800/80 gap-2 border border-zinc-700"
                            onClick={switchCamera}
                        >
                            <SwitchCamera className="h-5 w-5" />
                            Trocar Câmera
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-zinc-300 hover:text-white hover:bg-zinc-800/80 gap-2 border border-zinc-700"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-5 w-5" />
                            Usar Foto
                        </Button>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .pt-safe { padding-top: max(16px, env(safe-area-inset-top)); }
                .pb-safe { padding-bottom: max(24px, env(safe-area-inset-bottom)); }
            `}</style>
        </div>
    )
}
