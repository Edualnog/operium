"use client"

import { Flame, Trophy, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreakBadgeProps {
  currentStreak: number
  maxStreak: number
  status: 'active_today' | 'needs_action' | 'streak_lost' | 'no_streak'
  compact?: boolean
  className?: string
}

export function StreakBadge({
  currentStreak,
  maxStreak,
  status,
  compact = false,
  className
}: StreakBadgeProps) {
  // Determinar cor e ícone baseado no streak
  const getStreakStyle = () => {
    if (status === 'streak_lost' || status === 'no_streak') {
      return {
        bgColor: 'bg-zinc-100 dark:bg-zinc-800',
        textColor: 'text-zinc-500 dark:text-zinc-400',
        iconColor: 'text-zinc-400',
        glowClass: '',
      }
    }

    if (currentStreak >= 30) {
      return {
        bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
        textColor: 'text-white',
        iconColor: 'text-yellow-300',
        glowClass: 'shadow-lg shadow-purple-500/30 animate-pulse',
      }
    }

    if (currentStreak >= 14) {
      return {
        bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
        textColor: 'text-white',
        iconColor: 'text-yellow-300',
        glowClass: 'shadow-md shadow-orange-500/30',
      }
    }

    if (currentStreak >= 7) {
      return {
        bgColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
        textColor: 'text-white',
        iconColor: 'text-yellow-200',
        glowClass: '',
      }
    }

    if (currentStreak >= 3) {
      return {
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        iconColor: 'text-orange-500',
        glowClass: '',
      }
    }

    return {
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-700 dark:text-amber-300',
      iconColor: 'text-amber-500',
      glowClass: '',
    }
  }

  const style = getStreakStyle()
  const isRecord = currentStreak > 0 && currentStreak === maxStreak

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
          style.bgColor,
          style.textColor,
          style.glowClass,
          className
        )}
      >
        <Flame className={cn("h-3 w-3", style.iconColor)} />
        <span>{currentStreak}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all",
        style.bgColor,
        style.glowClass,
        className
      )}
    >
      {/* Ícone de fogo animado */}
      <div className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full",
        currentStreak >= 7 ? "bg-white/20" : "bg-white/50 dark:bg-black/20"
      )}>
        <Flame className={cn(
          "h-6 w-6",
          style.iconColor,
          currentStreak >= 7 && "animate-bounce"
        )} />
        {isRecord && (
          <Trophy className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
        )}
      </div>

      {/* Texto */}
      <div className="flex-1">
        {currentStreak === 0 ? (
          <>
            <div className={cn("flex items-center gap-2", style.textColor)}>
              <span className="text-sm font-medium">Comece seu streak!</span>
            </div>
            <div className="flex items-center gap-1 text-xs mt-0.5 opacity-70">
              <Zap className="h-3 w-3" />
              <span>Faça uma ação para iniciar</span>
            </div>
            {maxStreak > 0 && (
              <div className="text-xs mt-0.5 opacity-60">
                Recorde anterior: {maxStreak} dias
              </div>
            )}
          </>
        ) : (
          <>
            <div className={cn("flex items-center gap-2", style.textColor)}>
              <span className="text-lg font-bold">{currentStreak}</span>
              <span className="text-sm opacity-80">
                {currentStreak === 1 ? 'dia' : 'dias'} seguidos
              </span>
              {isRecord && currentStreak > 1 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 font-medium">
                  RECORDE!
                </span>
              )}
            </div>

            {status === 'needs_action' && (
              <div className="flex items-center gap-1 text-xs mt-0.5 opacity-90">
                <Zap className="h-3 w-3" />
                <span>Faça uma ação hoje para manter!</span>
              </div>
            )}

            {status === 'streak_lost' && maxStreak > 0 && (
              <div className="text-xs mt-0.5 opacity-70">
                Recorde: {maxStreak} dias
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Componente de mensagem motivacional
export function StreakMessage({ streak, isNewRecord }: { streak: number; isNewRecord: boolean }) {
  const getMessage = () => {
    if (isNewRecord && streak > 1) {
      return { emoji: '🏆', text: `Novo recorde! ${streak} dias!` }
    }

    if (streak >= 30) {
      return { emoji: '🔥', text: 'Você é imparável!' }
    }
    if (streak >= 14) {
      return { emoji: '⚡', text: 'Duas semanas de fogo!' }
    }
    if (streak >= 7) {
      return { emoji: '🌟', text: 'Uma semana inteira!' }
    }
    if (streak >= 3) {
      return { emoji: '💪', text: 'Mandando bem!' }
    }
    if (streak === 2) {
      return { emoji: '✨', text: '2 dias seguidos!' }
    }
    if (streak === 1) {
      return { emoji: '🎯', text: 'Streak iniciado!' }
    }

    return null
  }

  const message = getMessage()
  if (!message) return null

  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="text-2xl">{message.emoji}</span>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
        {message.text}
      </p>
    </div>
  )
}
