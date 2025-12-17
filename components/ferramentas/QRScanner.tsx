"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, SwitchCamera, Loader2, Camera } from "lucide-react"

interface QRScannerProps {
    onScan: (decodedText: string) => void
    onClose: () => void
    title?: string
    description?: string
}

export function QRScanner({ onScan, onClose, title, description }: QRScannerProps) {
    const [error, setError] = useState<string | null>(null)
    const [isStarting, setIsStarting] = useState(true)
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const scannerRef = useRef<any>(null)
    const isClosingRef = useRef(false)

    const stopCamera = useCallback(() => {
        // Stop all tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop()
            })
            streamRef.current = null
        }
        // Clear video source
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        // Stop scanner
        if (scannerRef.current) {
            try {
                scannerRef.current.stop()
            } catch (e) {
                // Ignore
            }
            scannerRef.current = null
        }
    }, [])

    const handleClose = useCallback(() => {
        if (isClosingRef.current) return
        isClosingRef.current = true
        stopCamera()
        onClose()
    }, [onClose, stopCamera])

    const startCamera = useCallback(async (mode: "environment" | "user" = facingMode) => {
        setIsStarting(true)
        setError(null)
        stopCamera()

        try {
            // Request camera with specific facing mode
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { ideal: mode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.setAttribute('playsinline', 'true')
                videoRef.current.setAttribute('autoplay', 'true')
                await videoRef.current.play()
            }

            // Dynamically import html5-qrcode for scanning
            const { Html5Qrcode } = await import("html5-qrcode")

            // Create a scanner that uses the existing stream
            // We'll scan video frames instead
            setIsStarting(false)

            // Start periodic frame scanning
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            const scanFrame = async () => {
                if (!videoRef.current || !ctx || isClosingRef.current) return

                const video = videoRef.current
                if (video.readyState !== video.HAVE_ENOUGH_DATA) {
                    requestAnimationFrame(scanFrame)
                    return
                }

                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                ctx.drawImage(video, 0, 0)

                try {
                    const imageData = canvas.toDataURL('image/png')
                    // Try to scan using Html5Qrcode
                    const scanner = new Html5Qrcode("temp-scanner", { verbose: false })
                    const result = await scanner.scanFile(
                        await fetch(imageData).then(r => r.blob()).then(b => new File([b], "frame.png", { type: "image/png" })),
                        false
                    )
                    if (result) {
                        onScan(result)
                        handleClose()
                        return
                    }
                } catch (e) {
                    // No QR found in this frame, continue scanning
                }

                if (!isClosingRef.current) {
                    requestAnimationFrame(scanFrame)
                }
            }

            // Start scanning after a short delay
            setTimeout(() => {
                if (!isClosingRef.current) {
                    scanFrame()
                }
            }, 500)

        } catch (err: any) {
            console.error("Camera error:", err)
            setIsStarting(false)

            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setError("Permissão negada. Permita o acesso à câmera.")
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                setError("Nenhuma câmera encontrada.")
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                setError("Câmera em uso. Feche outros apps.")
            } else if (err.name === "OverconstrainedError") {
                // Try again without facing mode constraint
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                    streamRef.current = fallbackStream
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream
                        await videoRef.current.play()
                    }
                    setIsStarting(false)
                } catch (fallbackErr) {
                    setError("Erro ao acessar câmera.")
                }
            } else {
                setError("Erro ao abrir câmera. Tente novamente.")
            }
        }
    }, [facingMode, stopCamera, onScan, handleClose])

    const switchCamera = useCallback(() => {
        const newMode = facingMode === "environment" ? "user" : "environment"
        setFacingMode(newMode)
        startCamera(newMode)
    }, [facingMode, startCamera])

    useEffect(() => {
        // Start camera with delay to ensure component is mounted
        const timer = setTimeout(() => {
            startCamera()
        }, 100)

        return () => {
            clearTimeout(timer)
            stopCamera()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            {/* Hidden element for scanner */}
            <div id="temp-scanner" style={{ display: 'none' }}></div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                <span className="text-white font-medium">
                    {title || "Escanear Código"}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10"
                    onClick={handleClose}
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Video */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                autoPlay
                muted
            />

            {/* Overlay with scan area */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Darkened areas around scan box */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-72 h-72">
                        {/* Scan box border */}
                        <div className="absolute inset-0 border-2 border-white/50 rounded-lg" />
                        {/* Corner indicators */}
                        <div className="absolute -top-1 -left-1 w-10 h-10 border-l-4 border-t-4 border-white rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-10 h-10 border-r-4 border-t-4 border-white rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-10 h-10 border-l-4 border-b-4 border-white rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 border-r-4 border-b-4 border-white rounded-br-lg" />
                        {/* Scanning line animation */}
                        <div className="absolute inset-x-2 h-0.5 bg-green-400 animate-pulse top-1/2" />
                    </div>
                </div>
            </div>

            {/* Loading overlay */}
            {isStarting && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
                    <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
                    <p className="text-white text-lg">Iniciando câmera...</p>
                    <p className="text-white/60 text-sm mt-2">Permita o acesso quando solicitado</p>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 p-6">
                    <Camera className="h-16 w-16 text-red-400 mb-4" />
                    <p className="text-white text-lg text-center mb-2">Erro ao acessar câmera</p>
                    <p className="text-white/60 text-sm text-center mb-6">{error}</p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="text-white border-white/30 hover:bg-white/10"
                            onClick={() => startCamera()}
                        >
                            Tentar novamente
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-white/70"
                            onClick={handleClose}
                        >
                            Fechar
                        </Button>
                    </div>
                </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-10 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-center text-white/80 text-sm mb-4">
                    {description || "Posicione o código QR no centro"}
                </p>
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        className="text-white border-white/40 hover:bg-white/20"
                        onClick={switchCamera}
                        disabled={isStarting}
                    >
                        <SwitchCamera className="h-5 w-5 mr-2" />
                        Trocar Câmera
                    </Button>
                </div>
            </div>
        </div>
    )
}
