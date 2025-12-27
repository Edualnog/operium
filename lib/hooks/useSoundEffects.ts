"use client"

import { useCallback, useEffect, useState } from "react"

// Tipos de sons disponíveis
export type SoundType =
  | "success" // Som sutil de sucesso (cadastro, ação completada)
  | "achievement" // Som especial de conquista (badge, milestone)
  | "levelUp" // Som de level up
  | "streak" // Som de streak
  | "click" // Som de clique sutil
  | "notification" // Som de notificação

// Chave no localStorage
const SOUND_ENABLED_KEY = "operium_sound_enabled"

// Criar contexto de áudio uma única vez
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (e) {
      console.warn("Web Audio API não suportada")
      return null
    }
  }

  // Resumir contexto se estiver suspenso (necessário após interação do usuário)
  if (audioContext.state === "suspended") {
    audioContext.resume()
  }

  return audioContext
}

// Gerar tons usando Web Audio API
function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  // Envelope de volume suave
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + duration * 0.5)
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

// Definições de sons
const soundDefinitions: Record<SoundType, (ctx: AudioContext) => void> = {
  success: (ctx) => {
    // Som suave de sucesso - dois tons ascendentes
    playTone(ctx, 523.25, 0.1, "sine", 0.2) // C5
    setTimeout(() => playTone(ctx, 659.25, 0.15, "sine", 0.2), 100) // E5
  },

  achievement: (ctx) => {
    // Som de conquista - fanfarra curta
    playTone(ctx, 523.25, 0.1, "sine", 0.3) // C5
    setTimeout(() => playTone(ctx, 659.25, 0.1, "sine", 0.3), 100) // E5
    setTimeout(() => playTone(ctx, 783.99, 0.1, "sine", 0.3), 200) // G5
    setTimeout(() => playTone(ctx, 1046.50, 0.3, "sine", 0.25), 300) // C6
  },

  levelUp: (ctx) => {
    // Som de level up - escala ascendente rápida
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99] // C4 E4 G4 C5 E5 G5
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(ctx, freq, 0.08, "sine", 0.25), i * 60)
    })
  },

  streak: (ctx) => {
    // Som de streak - tom com vibrato
    playTone(ctx, 440, 0.15, "sine", 0.25) // A4
    setTimeout(() => playTone(ctx, 554.37, 0.2, "sine", 0.25), 120) // C#5
  },

  click: (ctx) => {
    // Som de clique muito sutil
    playTone(ctx, 1000, 0.03, "sine", 0.1)
  },

  notification: (ctx) => {
    // Som de notificação suave
    playTone(ctx, 880, 0.1, "sine", 0.2) // A5
    setTimeout(() => playTone(ctx, 1108.73, 0.15, "sine", 0.15), 100) // C#6
  },
}

export function useSoundEffects() {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    const saved = localStorage.getItem(SOUND_ENABLED_KEY)
    return saved === null ? true : saved === "true"
  })

  // Sincronizar com localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SOUND_ENABLED_KEY, String(isEnabled))
    }
  }, [isEnabled])

  // Função para tocar um som
  const playSound = useCallback(
    (type: SoundType) => {
      if (!isEnabled) return

      const ctx = getAudioContext()
      if (!ctx) return

      try {
        soundDefinitions[type](ctx)
      } catch (e) {
        console.warn("Erro ao tocar som:", e)
      }
    },
    [isEnabled]
  )

  // Toggle para ativar/desativar
  const toggleSound = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

  // Ativar/desativar diretamente
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
  }, [])

  return {
    isEnabled,
    playSound,
    toggleSound,
    setSoundEnabled,
  }
}

// Hook simplificado para componentes que só precisam tocar sons
export function usePlaySound() {
  const { playSound, isEnabled } = useSoundEffects()
  return { playSound, isEnabled }
}
