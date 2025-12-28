"use client"

import { Flame, Trophy, Zap, Star, RotateCcw, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useAnalytics } from "@/lib/hooks/useAnalytics"

export interface GamificationData {
  colaborador_nome: string
  current_streak: number
  max_streak: number
  almox_score: number
  tipo_acao: "retirada" | "devolucao"
}

interface GamificationToastProps {
  data: GamificationData
  onClose: () => void
}

export function GamificationToast({ data, onClose }: GamificationToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const { trackGamification } = useAnalytics()

  const isNewRecord = data.current_streak > 0 && data.current_streak === data.max_streak

  useEffect(() => {
    // Track gamification event
    trackGamification({
      event_type: 'streak',
      previous_value: data.current_streak - 1,
      new_value: data.current_streak,
      trigger: data.tipo_acao,
    })

    // Track record if achieved
    if (isNewRecord && data.current_streak > 1) {
      trackGamification({
        event_type: 'milestone',
        new_value: data.current_streak,
        trigger: 'new_streak_record',
      })
    }

    // Track streak milestones
    if ([7, 14, 30].includes(data.current_streak)) {
      trackGamification({
        event_type: 'milestone',
        new_value: data.current_streak,
        trigger: 'streak_milestone',
      })
    }

    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50)

    // Auto close after 4 seconds
    const closeTimer = setTimeout(() => {
      setIsClosing(true)
      setTimeout(onClose, 300)
    }, 4000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(closeTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  const hasStreak = data.current_streak > 0

  // Get streak color based on count
  const getStreakColor = () => {
    if (data.current_streak >= 30) return "text-purple-500"
    if (data.current_streak >= 14) return "text-orange-500"
    if (data.current_streak >= 7) return "text-amber-500"
    if (data.current_streak >= 3) return "text-orange-400"
    return "text-amber-400"
  }

  // Get motivational message
  const getMessage = () => {
    if (data.tipo_acao === "devolucao") {
      if (data.current_streak >= 7) return "Colaborador exemplar!"
      return "Devolucao registrada!"
    }
    if (data.current_streak >= 30) return "Streak impressionante!"
    if (data.current_streak >= 14) return "Duas semanas ativo!"
    if (data.current_streak >= 7) return "Uma semana de fogo!"
    if (data.current_streak >= 3) return "Mandando bem!"
    return "Atividade registrada!"
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300",
        isVisible && !isClosing ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border shadow-xl backdrop-blur-sm",
          "bg-white/95 border-zinc-200 dark:bg-zinc-900/95 dark:border-zinc-700",
          "min-w-[280px] max-w-[360px]"
        )}
        onClick={handleClose}
      >
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        <div className="p-4">
          {/* Header with icon and action type */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
              data.tipo_acao === "devolucao"
                ? "bg-blue-100 dark:bg-blue-900/30"
                : "bg-amber-100 dark:bg-amber-900/30"
            )}>
              {data.tipo_acao === "devolucao" ? (
                <RotateCcw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {data.colaborador_nome}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {getMessage()}
              </p>
            </div>

            {/* Score badge */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Star className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {data.almox_score}
              </span>
            </div>
          </div>

          {/* Streak section */}
          {hasStreak && (
            <div className={cn(
              "mt-3 flex items-center gap-3 p-2 rounded-lg",
              "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50"
            )}>
              <div className="flex items-center gap-1.5">
                <Flame className={cn("h-5 w-5", getStreakColor(), data.current_streak >= 7 && "animate-pulse")} />
                <span className={cn("text-lg font-bold", getStreakColor())}>
                  {data.current_streak}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {data.current_streak === 1 ? "dia" : "dias"}
                </span>
              </div>

              {isNewRecord && data.current_streak > 1 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30">
                  <Trophy className="h-3 w-3 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                    RECORDE!
                  </span>
                </div>
              )}

              {data.current_streak >= 7 && !isNewRecord && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30">
                  <Zap className="h-3 w-3 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                    ON FIRE
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Click to dismiss hint */}
        <div className="absolute bottom-1 right-2 text-[10px] text-zinc-400 dark:text-zinc-500">
          clique para fechar
        </div>
      </div>
    </div>
  )
}
