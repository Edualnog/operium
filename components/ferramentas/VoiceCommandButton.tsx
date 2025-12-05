"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Loader2, Square } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"
import { cn } from "@/lib/utils"

interface VoiceCommandResponse {
    text: string
    intent: {
        action: "retirada" | "devolucao"
        quantity: number
        item_name: string
        collaborator_name?: string
    }
}

interface VoiceCommandButtonProps {
    onCommandReceived: (data: VoiceCommandResponse) => void
    disabled?: boolean
    className?: string
}

export function VoiceCommandButton({
    onCommandReceived,
    disabled,
    className,
}: VoiceCommandButtonProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const { toast } = useToast()

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            chunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
                const file = new File([audioBlob], "command.webm", { type: "audio/webm" })
                await processAudio(file)

                // Parar todas as tracks para liberar o microfone
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
        } catch (error) {
            console.error("Erro ao acessar microfone:", error)
            toast.error("Não foi possível acessar o microfone.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const processAudio = async (file: File) => {
        setIsProcessing(true)
        try {
            const formData = new FormData()
            formData.append("audio", file)

            const response = await fetch("/api/ai/voice-command", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                throw new Error("Erro ao processar áudio")
            }

            const data = await response.json()
            onCommandReceived(data)
            toast.success("Comando processado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao entender o comando. Tente novamente.")
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            className={cn(
                "relative transition-all duration-300",
                isRecording && "animate-pulse ring-2 ring-red-500 ring-offset-2",
                className
            )}
            disabled={disabled || isProcessing}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => {
                e.preventDefault() // Previne comportamentos padrão de toque
                startRecording()
            }}
            onTouchEnd={(e) => {
                e.preventDefault()
                stopRecording()
            }}
            title="Segure para falar"
        >
            {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
                <Square className="h-4 w-4" />
            ) : (
                <Mic className="h-4 w-4" />
            )}
        </Button>
    )
}
