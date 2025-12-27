"use client"

import { Package, Users, Trophy, Zap, Star, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export interface RegistrationCelebrationData {
  type: "ferramenta" | "colaborador"
  itemName: string
  totalCount: number
}

interface RegistrationCelebrationProps {
  data: RegistrationCelebrationData
  onClose: () => void
}

// Milestones para celebração especial
const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000]

export function RegistrationCelebration({ data, onClose }: RegistrationCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const isMilestone = MILESTONES.includes(data.totalCount)
  const nextMilestone = MILESTONES.find(m => m > data.totalCount) || data.totalCount + 10

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50)

    // Auto close - mais tempo para milestones
    const closeTimer = setTimeout(() => {
      setIsClosing(true)
      setTimeout(onClose, 300)
    }, isMilestone ? 5000 : 3000)

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

  const Icon = data.type === "ferramenta" ? Package : Users
  const typeLabel = data.type === "ferramenta" ? "Produto" : "Colaborador"
  const typeLabelPlural = data.type === "ferramenta" ? "produtos" : "colaboradores"

  // Mensagens motivacionais baseadas na contagem
  const getMessage = () => {
    if (isMilestone) {
      if (data.totalCount >= 100) return "Estoque impressionante!"
      if (data.totalCount >= 50) return "Meio caminho andado!"
      if (data.totalCount >= 25) return "Crescendo bem!"
      if (data.totalCount >= 10) return "Dupla dezena!"
      return "Primeira meta!"
    }
    if (data.totalCount <= 3) return "Bom começo!"
    return "Cadastrado com sucesso!"
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
          "relative overflow-hidden rounded-xl border shadow-xl backdrop-blur-sm cursor-pointer",
          "min-w-[280px] max-w-[360px]",
          isMilestone
            ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 dark:from-amber-950 dark:to-orange-950 dark:border-amber-600"
            : "bg-white/95 border-zinc-200 dark:bg-zinc-900/95 dark:border-zinc-700"
        )}
        onClick={handleClose}
      >
        {/* Gradient top border */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          data.type === "ferramenta"
            ? "bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500"
            : "bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500"
        )} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
              data.type === "ferramenta"
                ? "bg-blue-100 dark:bg-blue-900/30"
                : "bg-purple-100 dark:bg-purple-900/30"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                data.type === "ferramenta"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-purple-600 dark:text-purple-400"
              )} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {data.itemName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {getMessage()}
              </p>
            </div>

            {/* Counter badge */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              isMilestone
                ? "bg-amber-200 dark:bg-amber-800"
                : "bg-zinc-100 dark:bg-zinc-800"
            )}>
              {isMilestone && <Star className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
              <span className={cn(
                "text-xs font-semibold",
                isMilestone
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-zinc-600 dark:text-zinc-400"
              )}>
                #{data.totalCount}
              </span>
            </div>
          </div>

          {/* Milestone celebration */}
          {isMilestone && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-amber-100/50 dark:bg-amber-900/30">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {data.totalCount} {typeLabelPlural} cadastrados!
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            </div>
          )}

          {/* Progress to next milestone */}
          {!isMilestone && data.totalCount > 1 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Progresso</span>
                <span>{data.totalCount}/{nextMilestone}</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    data.type === "ferramenta"
                      ? "bg-gradient-to-r from-blue-400 to-cyan-500"
                      : "bg-gradient-to-r from-purple-400 to-pink-500"
                  )}
                  style={{ width: `${(data.totalCount / nextMilestone) * 100}%` }}
                />
              </div>
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
