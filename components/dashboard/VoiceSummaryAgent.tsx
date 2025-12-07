"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2, StopCircle, Sparkles, Pause } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

export function VoiceSummaryAgent() {
    const [loading, setLoading] = useState(false)
    const [playing, setPlaying] = useState(false)
    const [audioData, setAudioData] = useState<number[]>(new Array(5).fill(10))

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    const { toast } = useToast()

    const { t } = useTranslation('common')

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (audioContextRef.current) {
                audioContextRef.current.close()
            }
        }
    }, [])

    const initializeAudioContext = () => {
        if (!audioRef.current) return

        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext
            audioContextRef.current = new AudioContext()

            analyserRef.current = audioContextRef.current.createAnalyser()
            analyserRef.current.fftSize = 32

            sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current)
            sourceRef.current.connect(analyserRef.current)
            analyserRef.current.connect(audioContextRef.current.destination)
        }
    }

    useEffect(() => {
        const updateVisualizer = () => {
            if (!analyserRef.current || !playing) return

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
            analyserRef.current.getByteFrequencyData(dataArray)

            // Pegar 5 frequências distribuídas
            const relevantFreqs = [
                dataArray[0], // Graves
                dataArray[2],
                dataArray[4], // Médios
                dataArray[6],
                dataArray[8]  // Agudos
            ]

            // Normalizar para altura das barras (10 a 100%)
            const normalizedData = relevantFreqs.map(val => Math.max(15, (val / 255) * 100))
            setAudioData(normalizedData)

            animationFrameRef.current = requestAnimationFrame(updateVisualizer)
        }

        if (playing) {
            updateVisualizer()
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            // Reset visualizer
            setAudioData(new Array(5).fill(15))
        }
    }, [playing])

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
                audioRef.current.src = url

                initializeAudioContext()

                // Resume context if suspended (browser policy)
                if (audioContextRef.current?.state === 'suspended') {
                    await audioContextRef.current.resume()
                }

                await audioRef.current.play()
                setPlaying(true)

                audioRef.current.onended = () => {
                    setPlaying(false)
                    URL.revokeObjectURL(url)
                }
            }
        } catch (error) {
            console.error(error)
            toast.error(t("dashboard.ai.voice_summary.error"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlaySummary}
                disabled={loading}
                className={cn(
                    "relative group flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300",
                    "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                    "hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10",
                    playing && "border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-500/20"
                )}
            >
                {/* Background Gradient Animation */}
                <div className={cn(
                    "absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                    "bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"
                )} />

                {/* Icon State */}
                <div className="relative z-10 flex items-center justify-center w-6 h-6">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, rotate: -90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 90 }}
                            >
                                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                            </motion.div>
                        ) : playing ? (
                            <motion.div
                                key="playing"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                            >
                                <StopCircle className="w-5 h-5 text-purple-500 fill-purple-500/20" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                            >
                                <Sparkles className="w-5 h-5 text-zinc-500 group-hover:text-purple-500 transition-colors" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Text & Visualizer */}
                <div className="relative z-10 flex items-center gap-3 min-w-[120px]">
                    {playing ? (
                        <div className="flex items-center gap-1 h-4">
                            {audioData.map((height, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                                    animate={{ height: `${height}%` }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                />
                            ))}
                        </div>
                    ) : (
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                            {loading ? t("dashboard.ai.voice_summary.generating") : t("dashboard.ai.voice_summary.button")}
                        </span>
                    )}
                </div>

                {/* Status Indicator */}
                {!playing && !loading && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                )}
            </motion.button>
        </div>
    )
}
