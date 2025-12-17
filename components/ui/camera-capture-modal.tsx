"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Camera, RefreshCw, Loader2, SwitchCamera } from "lucide-react"
import { useTranslation } from "react-i18next"

interface CameraCaptureModalProps {
    isOpen: boolean
    onClose: () => void
    onCapture: (file: File) => void
}

export function CameraCaptureModal({
    isOpen,
    onClose,
    onCapture,
}: CameraCaptureModalProps) {
    const { t } = useTranslation('common')
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
            setStream(null)
        }
    }, [])

    const startCamera = useCallback(async (mode: "user" | "environment" = facingMode) => {
        setLoading(true)
        setError(null)
        // Parar stream anterior se existir
        stopCamera()

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode },
                audio: false,
            })
            streamRef.current = mediaStream
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err)

            let errorMessage = t('camera.error.general')

            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                errorMessage = t('camera.error.permission')
            } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                errorMessage = t('camera.error.not_found')
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                errorMessage = t('camera.error.in_use')
            } else if (err.name === "OverconstrainedError") {
                errorMessage = t('camera.error.not_available')
                // Fallback: tentar qualquer câmera se a traseira falhar
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false,
                    })
                    streamRef.current = fallbackStream
                    setStream(fallbackStream)
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream
                    }
                    setLoading(false)
                    return // Sucesso no fallback, não mostrar erro
                } catch (fallbackErr) {
                    console.error("Fallback camera error:", fallbackErr)
                }
            } else if (err.name === "TypeError" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
                errorMessage = t('camera.error.https')
            }

            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }, [stopCamera, facingMode, t])

    const flipCamera = useCallback(() => {
        const newMode = facingMode === "environment" ? "user" : "environment"
        setFacingMode(newMode)
        startCamera(newMode)
    }, [facingMode, startCamera])

    useEffect(() => {
        if (isOpen) {
            startCamera()
        }

        return () => {
            stopCamera()
        }
    }, [isOpen, startCamera, stopCamera])

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            const context = canvas.getContext("2d")

            if (context) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight

                // If using front camera, flip horizontally for mirror effect
                if (facingMode === "user") {
                    context.translate(canvas.width, 0)
                    context.scale(-1, 1)
                }

                // Draw video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height)

                // Convert canvas to blob/file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `camera_capture_${Date.now()}.jpg`, {
                            type: "image/jpeg",
                        })
                        onCapture(file)
                        onClose()
                    }
                }, "image/jpeg", 0.8)
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('camera.title')}</DialogTitle>
                    <DialogDescription>
                        {t('camera.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    {loading && <Loader2 className="h-8 w-8 text-white animate-spin" />}

                    {error ? (
                        <div className="text-white text-center p-4">
                            <p className="text-sm text-red-400 mb-2">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startCamera()}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {t('camera.retry')}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                            />
                            {/* Camera flip button */}
                            {stream && !loading && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={flipCamera}
                                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
                                    title={t('camera.flip')}
                                >
                                    <SwitchCamera className="h-5 w-5" />
                                </Button>
                            )}
                        </>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCapture} disabled={!stream || loading || !!error}>
                        <Camera className="h-4 w-4 mr-2" />
                        {t('camera.capture')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
