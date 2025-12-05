"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2, StopCircle } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"

export function DashboardVoiceSummary() {
    const [loading, setLoading] = useState(false)
    const [playing, setPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const { toast } = useToast()

    console.log("DashboardVoiceSummary rendering")

    const handlePlaySummary = async () => {
        if (playing && audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            setPlaying(false)
            return
        }

        setLoading(true)
        try {
            const response = await fetch("/api/ai/voice-summary", {
                method: "POST",
            })

            if (!response.ok) {
                throw new Error("Falha ao gerar resumo")
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)

            if (audioRef.current) {
                console.log("Setting audio src, blob size:", blob.size)
                audioRef.current.src = url

                try {
                    await audioRef.current.play()
                    console.log("Audio playback started")
                    setPlaying(true)
                } catch (playError) {
                    console.error("Playback failed:", playError)
                    toast.error("Erro ao reproduzir áudio (permissão ou formato)")
                }

                audioRef.current.onended = () => {
                    console.log("Audio playback ended")
                    setPlaying(false)
                    URL.revokeObjectURL(url)
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro ao gerar resumo de voz")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <audio ref={audioRef} className="hidden" />
            <Button
                variant="outline"
                size="sm"
                onClick={handlePlaySummary}
                disabled={loading}
                className="gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : playing ? (
                    <StopCircle className="h-4 w-4" />
                ) : (
                    <Play className="h-4 w-4" />
                )}
                {loading ? "Gerando Resumo..." : playing ? "Parar Resumo" : "Ouvir Resumo Diário"}
            </Button>
        </div>
    )
}
