"use client"

import { useEffect, useRef, useState } from "react"
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
    const scannerRef = useRef<any>(null)
    const containerIdRef = useRef(`qr-scanner-${Date.now()}`)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isMountedRef = useRef(true)
    const hasScannedRef = useRef(false)

    // Stop scanner
    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState()
                if (state === 2) { // SCANNING
                    await scannerRef.current.stop()
                }
                await scannerRef.current.clear()
            } catch (err) {
                console.log("Scanner cleanup:", err)
            }
            scannerRef.current = null
        }
    }

    // Handle close
    const handleCloseClick = async () => {
        await stopScanner()
        onClose()
    }

    // Handle successful scan
    const handleSuccessfulScan = async (decodedText: string) => {
        if (hasScannedRef.current) return
        hasScannedRef.current = true

        await stopScanner()
        onScan(decodedText)
        onClose()
    }

    // Start scanner
    const startScanner = async (mode: "environment" | "user") => {
        if (!isMountedRef.current) return

        setIsStarting(true)
        setError(null)
        hasScannedRef.current = false

        try {
            await stopScanner()

            const { Html5Qrcode } = await import("html5-qrcode")

            if (!isMountedRef.current) return

            const scanner = new Html5Qrcode(containerIdRef.current)
            scannerRef.current = scanner

            await scanner.start(
                { facingMode: mode },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // Success callback
                    handleSuccessfulScan(decodedText)
                },
                () => {
                    // Error callback - ignore, keep scanning
                }
            )

            setIsStarting(false)
            setCameraMode("stream")

        } catch (err: any) {
            console.error("Scanner error:", err)
            if (!isMountedRef.current) return

            setIsStarting(false)
            setCameraMode("file")
            setError("Não foi possível acessar a câmera. Use o botão para tirar uma foto.")
        }
    }

    // Switch camera
    const handleSwitchCamera = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const newMode = facingMode === "environment" ? "user" : "environment"
        setFacingMode(newMode)
        await startScanner(newMode)
    }

    // Handle file input click
    const handleUsePhoto = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        fileInputRef.current?.click()
    }

    // Handle file selection
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError("Processando imagem...")

        try {
            const { Html5Qrcode } = await import("html5-qrcode")
            const tempId = 'temp-scanner-' + Date.now()
            const tempDiv = document.createElement('div')
            tempDiv.id = tempId
            tempDiv.style.display = 'none'
            document.body.appendChild(tempDiv)

            const scanner = new Html5Qrcode(tempId)
            const result = await scanner.scanFile(file, false)

            await scanner.clear()
            document.body.removeChild(tempDiv)

            if (result) {
                await stopScanner()
                onScan(result)
                onClose()
            } else {
                setError("Código não encontrado. Tente novamente.")
            }
        } catch (scanErr) {
            console.error("Scan error:", scanErr)
            setError("Código não encontrado na imagem.")
        }

        e.target.value = ''
    }

    // Mount/unmount
    useEffect(() => {
        isMountedRef.current = true

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            startScanner(facingMode)
        }, 100)

        return () => {
            isMountedRef.current = false
            clearTimeout(timer)
            stopScanner()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
                <span className="text-white font-semibold text-lg">
                    {title || "Escanear Código"}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-zinc-800 h-11 w-11"
                    onClick={handleCloseClick}
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
                {/* Scanner container */}
                {cameraMode === "stream" && (
                    <div className="w-full max-w-sm aspect-square relative rounded-2xl overflow-hidden bg-zinc-900">
                        <div id={containerIdRef.current} className="w-full h-full" />

                        {/* Loading overlay */}
                        {isStarting && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                                <Loader2 className="h-10 w-10 text-white animate-spin mb-3" />
                                <p className="text-white text-sm">Iniciando câmera...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* File mode fallback */}
                {cameraMode === "file" && (
                    <div className="w-full max-w-sm aspect-square relative rounded-2xl overflow-hidden bg-zinc-800 flex flex-col items-center justify-center p-6">
                        <Camera className="h-16 w-16 text-zinc-600 mb-4" />
                        <p className="text-zinc-300 text-center mb-6 text-sm">
                            A câmera ao vivo não está disponível. Use o botão abaixo para tirar uma foto.
                        </p>
                        <Button
                            onClick={handleUsePhoto}
                            className="bg-zinc-700 hover:bg-zinc-600 text-white gap-2"
                        >
                            <Camera className="h-5 w-5" />
                            Tirar Foto
                        </Button>
                    </div>
                )}

                {/* Description */}
                <p className="mt-6 text-center text-sm text-zinc-400 px-4 max-w-sm">
                    {description || "Posicione o código QR no centro da tela"}
                </p>

                {/* Error/status message */}
                {error && (
                    <div className="mt-3 bg-zinc-800 rounded-lg px-4 py-2 max-w-sm">
                        <p className="text-zinc-300 text-sm text-center">{error}</p>
                    </div>
                )}
            </div>

            {/* Bottom actions */}
            <div className="p-4 flex justify-center gap-3 bg-black" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
                {cameraMode === "stream" && !isStarting && (
                    <>
                        <Button
                            variant="ghost"
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-2"
                            onClick={handleSwitchCamera}
                            type="button"
                        >
                            <SwitchCamera className="h-5 w-5" />
                            Trocar Câmera
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-2"
                            onClick={handleUsePhoto}
                            type="button"
                        >
                            <Upload className="h-5 w-5" />
                            Usar Foto
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}
