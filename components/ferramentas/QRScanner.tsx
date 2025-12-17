"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { X, SwitchCamera, Loader2 } from "lucide-react"

interface QRScannerProps {
    onScan: (decodedText: string) => void
    onClose: () => void
    title?: string
    description?: string
}

export function QRScanner({ onScan, onClose, title, description }: QRScannerProps) {
    const [error, setError] = useState<string | null>(null)
    const [isStarting, setIsStarting] = useState(true)
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0)
    const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
    const isClosingRef = useRef(false)
    const videoContainerRef = useRef<HTMLDivElement>(null)

    const stopScanner = useCallback(async () => {
        if (html5QrcodeRef.current) {
            try {
                if (html5QrcodeRef.current.isScanning) {
                    await html5QrcodeRef.current.stop()
                }
            } catch (err) {
                console.error("Error stopping scanner:", err)
            }
            html5QrcodeRef.current = null
        }
    }, [])

    const handleClose = useCallback(async () => {
        if (isClosingRef.current) return
        isClosingRef.current = true
        await stopScanner()
        onClose()
    }, [onClose, stopScanner])

    const startScanner = useCallback(async (cameraId?: string) => {
        setIsStarting(true)
        setError(null)

        try {
            // Get available cameras
            const devices = await Html5Qrcode.getCameras()
            if (devices && devices.length > 0) {
                setCameras(devices)

                // Prefer back camera
                let preferredIndex = devices.findIndex(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('traseira') ||
                    d.label.toLowerCase().includes('environment')
                )
                if (preferredIndex === -1) preferredIndex = 0

                const selectedCameraId = cameraId || devices[preferredIndex].id
                const selectedIndex = devices.findIndex(d => d.id === selectedCameraId)
                setCurrentCameraIndex(selectedIndex >= 0 ? selectedIndex : 0)

                // Create scanner instance
                if (!html5QrcodeRef.current) {
                    html5QrcodeRef.current = new Html5Qrcode("qr-reader-element")
                }

                // Start scanning
                await html5QrcodeRef.current.start(
                    selectedCameraId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        // Success - call callback and close
                        onScan(decodedText)
                        handleClose()
                    },
                    (errorMessage) => {
                        // Scan error - ignore (normal when no QR found)
                    }
                )
                setIsStarting(false)
            } else {
                setError("Nenhuma câmera encontrada. Verifique as permissões.")
                setIsStarting(false)
            }
        } catch (err: any) {
            console.error("Camera error:", err)
            if (err.message?.includes("Permission")) {
                setError("Permissão negada. Por favor, permita o acesso à câmera nas configurações do navegador.")
            } else if (err.message?.includes("NotFoundError")) {
                setError("Câmera não encontrada. Verifique se seu dispositivo possui câmera.")
            } else if (err.message?.includes("NotReadableError")) {
                setError("Câmera em uso por outro aplicativo. Feche outros apps e tente novamente.")
            } else {
                setError(`Erro ao acessar câmera: ${err.message || 'Desconhecido'}`)
            }
            setIsStarting(false)
        }
    }, [onScan, handleClose])

    const switchCamera = useCallback(async () => {
        if (cameras.length < 2) return

        await stopScanner()
        const nextIndex = (currentCameraIndex + 1) % cameras.length
        await startScanner(cameras[nextIndex].id)
    }, [cameras, currentCameraIndex, stopScanner, startScanner])

    useEffect(() => {
        // Delay to ensure DOM is ready
        const timer = setTimeout(() => {
            startScanner()
        }, 200)

        return () => {
            clearTimeout(timer)
            stopScanner()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 safe-area-top">
                <div className="w-12" />
                <h3 className="text-white font-semibold text-lg">
                    {title || "Escanear Código"}
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-12 w-12"
                    onClick={handleClose}
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Scanner area */}
            <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div
                    ref={videoContainerRef}
                    className="w-full max-w-sm aspect-square relative rounded-xl overflow-hidden bg-zinc-900"
                >
                    {/* Video element created by html5-qrcode */}
                    <div id="qr-reader-element" className="w-full h-full" />

                    {/* Overlay frame */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 border-2 border-white/30 rounded-xl" />
                        {/* Corner indicators */}
                        <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
                        <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
                        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
                        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
                    </div>

                    {/* Loading overlay */}
                    {isStarting && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                            <Loader2 className="h-10 w-10 text-white animate-spin mb-3" />
                            <p className="text-white text-sm">Iniciando câmera...</p>
                        </div>
                    )}
                </div>

                {/* Description */}
                <p className="mt-6 text-center text-sm text-gray-400 px-4 max-w-sm">
                    {description || "Posicione o código QR ou de barras dentro do quadro para escanear."}
                </p>

                {/* Error */}
                {error && (
                    <div className="mt-4 bg-red-900/50 border border-red-500/50 rounded-lg p-4 mx-4 max-w-sm">
                        <p className="text-red-300 text-sm text-center">{error}</p>
                        <div className="flex gap-2 mt-3 justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-white border-white/30 hover:bg-white/10"
                                onClick={() => startScanner()}
                            >
                                Tentar novamente
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white/70 hover:bg-white/10"
                                onClick={handleClose}
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom actions */}
            <div className="p-4 pb-8 safe-area-bottom flex justify-center">
                {cameras.length > 1 && !isStarting && !error && (
                    <Button
                        variant="outline"
                        className="text-white border-white/30 hover:bg-white/20 gap-2"
                        onClick={switchCamera}
                    >
                        <SwitchCamera className="h-5 w-5" />
                        Trocar Câmera
                    </Button>
                )}
            </div>

            {/* Styles */}
            <style jsx global>{`
                #qr-reader-element {
                    width: 100% !important;
                    height: 100% !important;
                    border: none !important;
                    padding: 0 !important;
                }
                #qr-reader-element video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 12px !important;
                }
                #qr-reader-element img {
                    display: none !important;
                }
                #qr-reader-element > div:first-child {
                    border: none !important;
                }
                .safe-area-top {
                    padding-top: env(safe-area-inset-top, 16px);
                }
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom, 32px);
                }
            `}</style>
        </div>
    )
}
