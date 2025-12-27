"use client"

import { Package, Users, Trophy, Target, Sparkles, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Milestones para progresso
const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000]

interface GamificationProgressProps {
  type: "ferramenta" | "colaborador"
  currentCount: number
  className?: string
}

export function GamificationProgress({ type, currentCount, className }: GamificationProgressProps) {
  // Encontrar o próximo milestone
  const nextMilestone = MILESTONES.find(m => m > currentCount) || currentCount + 100
  const prevMilestone = [...MILESTONES].reverse().find(m => m <= currentCount) || 0

  // Calcular progresso dentro do segmento atual
  const segmentProgress = prevMilestone === 0
    ? (currentCount / nextMilestone) * 100
    : ((currentCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100

  // Verificar se atingiu algum milestone
  const achievedMilestones = MILESTONES.filter(m => currentCount >= m)
  const latestMilestone = achievedMilestones[achievedMilestones.length - 1]

  const Icon = type === "ferramenta" ? Package : Users
  const typeLabel = type === "ferramenta" ? "produtos" : "colaboradores"
  const singularLabel = type === "ferramenta" ? "produto" : "colaborador"

  // Cores baseadas no tipo
  const colors = type === "ferramenta"
    ? {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-100 dark:bg-blue-900/50",
        progress: "from-blue-400 to-cyan-500",
        text: "text-blue-700 dark:text-blue-300",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      }
    : {
        bg: "bg-purple-50 dark:bg-purple-950/30",
        border: "border-purple-200 dark:border-purple-800",
        icon: "text-purple-600 dark:text-purple-400",
        iconBg: "bg-purple-100 dark:bg-purple-900/50",
        progress: "from-purple-400 to-pink-500",
        text: "text-purple-700 dark:text-purple-300",
        badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
      }

  return (
    <div className={cn(
      "rounded-xl border p-4",
      colors.bg,
      colors.border,
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
          colors.iconBg
        )}>
          <Icon className={cn("h-5 w-5", colors.icon)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={cn("text-sm font-medium", colors.text)}>
              {currentCount} {currentCount === 1 ? singularLabel : typeLabel}
            </span>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-zinc-400" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Meta: {nextMilestone}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-500 bg-gradient-to-r",
                colors.progress
              )}
              style={{ width: `${Math.min(segmentProgress, 100)}%` }}
            />
          </div>

          {/* Milestone badges */}
          {achievedMilestones.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Trophy className="h-3 w-3 text-amber-500" />
              <div className="flex gap-1 flex-wrap">
                {achievedMilestones.slice(-3).map(milestone => (
                  <span
                    key={milestone}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      colors.badge
                    )}
                  >
                    {milestone}
                  </span>
                ))}
                {achievedMilestones.length > 3 && (
                  <span className="text-[10px] text-zinc-400">
                    +{achievedMilestones.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Next milestone indicator */}
        {currentCount > 0 && nextMilestone - currentCount <= 3 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 animate-pulse">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Faltam {nextMilestone - currentCount}!
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Versão compacta para usar em headers
export function GamificationProgressCompact({ type, currentCount, className }: GamificationProgressProps) {
  const nextMilestone = MILESTONES.find(m => m > currentCount) || currentCount + 100
  const progress = (currentCount / nextMilestone) * 100

  const Icon = type === "ferramenta" ? Package : Users

  const colors = type === "ferramenta"
    ? { icon: "text-blue-500", progress: "bg-blue-500" }
    : { icon: "text-purple-500", progress: "bg-purple-500" }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800",
      className
    )}>
      <Icon className={cn("h-4 w-4", colors.icon)} />
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {currentCount}
      </span>
      <div className="w-12 bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
        <div
          className={cn("h-1.5 rounded-full transition-all", colors.progress)}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400">/{nextMilestone}</span>
    </div>
  )
}
