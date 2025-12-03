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
import { Camera, RefreshCw, Loader2 } from "lucide-react"

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
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const startCamera = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }, // Prefer rear camera on mobile
                audio: false,
            })
            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err)
            setError(
                "Não foi possível acessar a câmera. Verifique se você deu permissão de acesso."
            )
        } finally {
            setLoading(false)
        }
    }, [])

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop())
            setStream(null)
        }
    }, [stream])

    useEffect(() => {
        if (isOpen) {
            startCamera()
        } else {
            stopCamera()
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
                    <DialogTitle>Tirar Foto</DialogTitle>
                    <DialogDescription>
                        Posicione a câmera e clique em capturar.
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
                                onClick={startCamera}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Tentar Novamente
                            </Button>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleCapture} disabled={!stream || loading || !!error}>
                        <Camera className="h-4 w-4 mr-2" />
                        Capturar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
