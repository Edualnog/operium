"use client"

import { useState, useRef } from "react"
import { useToast } from "@/components/ui/toast-context"
import { cn } from "@/lib/utils"
import { AIVoiceInput } from "@/components/ui/ai-voice-input"

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
    context?: "movimentacao" | "ferramenta" | "colaborador"
}

export function VoiceCommandButton({
    onCommandReceived,
    disabled,
    className,
    context = "movimentacao",
}: VoiceCommandButtonProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const { toast } = useToast()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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

            // Parar automaticamente após 10 segundos
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    stopRecording()
                    toast.info("Gravação encerrada automaticamente (limite de 10s).")
                }
            }, 10000)

        } catch (error) {
            console.error("Erro ao acessar microfone:", error)
            toast.error("Não foi possível acessar o microfone.")
        }
    }

    const stopRecording = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
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
            formData.append("context", context)

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
        <div className={cn("w-full", className)}>
            <AIVoiceInput
                isRecording={isRecording}
                onStart={startRecording}
                onStop={stopRecording}
                className={isProcessing ? "opacity-50 pointer-events-none" : ""}
            />
        </div>
    )
}
