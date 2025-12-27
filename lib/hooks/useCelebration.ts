"use client"

import confetti from 'canvas-confetti'
import { useCallback } from 'react'

type CelebrationType =
  | 'action_complete'      // Ação básica completada
  | 'streak_continued'     // Streak mantido
  | 'streak_milestone'     // Milestone de streak (7, 14, 30 dias)
  | 'new_record'           // Novo recorde de streak
  | 'level_up'             // Subiu de level
  | 'equipment_accepted'   // Equipamento aceito
  | 'return_completed'     // Devolução feita

interface CelebrationOptions {
  type: CelebrationType
  streakCount?: number
  newLevel?: string
}

export function useCelebration() {

  // Confetti básico para ações normais
  const fireBasic = useCallback(() => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b'],
      disableForReducedMotion: true,
    })
  }, [])

  // Confetti de streak - fogo laranja/vermelho
  const fireStreak = useCallback((count: number) => {
    const intensity = Math.min(count / 10, 1) // Mais dias = mais intenso

    confetti({
      particleCount: 30 + Math.floor(count * 5),
      spread: 50 + count * 2,
      origin: { y: 0.6 },
      colors: ['#f97316', '#ef4444', '#fbbf24', '#dc2626'],
      scalar: 1 + intensity * 0.3,
      disableForReducedMotion: true,
    })
  }, [])

  // Celebração épica para milestones e level up
  const fireEpic = useCallback(() => {
    const duration = 2000
    const animationEnd = Date.now() + duration
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      disableForReducedMotion: true,
    }

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
      })
    }, 250)
  }, [])

  // Chuva de estrelas para novo recorde
  const fireStars = useCallback(() => {
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0.5,
      decay: 0.94,
      startVelocity: 20,
      colors: ['#ffd700', '#ffec8b', '#fff8dc'],
      shapes: ['star'] as confetti.Shape[],
      scalar: 1.2,
      disableForReducedMotion: true,
    }

    confetti({
      ...defaults,
      particleCount: 30,
      origin: { x: 0.5, y: 0.5 },
    })

    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 20,
        origin: { x: 0.3, y: 0.6 },
      })
      confetti({
        ...defaults,
        particleCount: 20,
        origin: { x: 0.7, y: 0.6 },
      })
    }, 200)
  }, [])

  // Função principal de celebração
  const celebrate = useCallback((options: CelebrationOptions) => {
    const { type, streakCount = 1 } = options

    // Vibrar dispositivo se suportado
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      switch (type) {
        case 'level_up':
        case 'streak_milestone':
        case 'new_record':
          navigator.vibrate([100, 50, 100, 50, 200])
          break
        default:
          navigator.vibrate(50)
      }
    }

    // Disparar confetti apropriado
    switch (type) {
      case 'action_complete':
      case 'equipment_accepted':
      case 'return_completed':
        fireBasic()
        break

      case 'streak_continued':
        fireStreak(streakCount)
        break

      case 'streak_milestone':
        fireEpic()
        break

      case 'new_record':
        fireStars()
        setTimeout(fireEpic, 500)
        break

      case 'level_up':
        fireEpic()
        setTimeout(fireStars, 1000)
        break

      default:
        fireBasic()
    }
  }, [fireBasic, fireStreak, fireEpic, fireStars])

  return { celebrate }
}
