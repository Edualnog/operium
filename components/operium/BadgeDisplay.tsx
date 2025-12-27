"use client"

import { cn } from "@/lib/utils"
import {
  Star,
  Flame,
  Trophy,
  Gem,
  Zap,
  Rocket,
  Crown,
  Package,
  Shield,
  Sunrise,
  Moon,
  Calendar,
  Lock
} from "lucide-react"

export interface Badge {
  badge_id: string
  nome: string
  descricao: string
  icone: string
  categoria: string
  raridade: string
  xp_bonus: number
  earned_at: string | null
  is_earned: boolean
}

interface BadgeDisplayProps {
  badges: Badge[]
  compact?: boolean
  showLocked?: boolean
  className?: string
}

const iconMap: Record<string, React.ElementType> = {
  star: Star,
  flame: Flame,
  trophy: Trophy,
  gem: Gem,
  zap: Zap,
  rocket: Rocket,
  crown: Crown,
  package: Package,
  shield: Shield,
  sunrise: Sunrise,
  moon: Moon,
  calendar: Calendar,
}

const raridadeStyles: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  comum: {
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    border: 'border-zinc-300 dark:border-zinc-600',
    text: 'text-zinc-600 dark:text-zinc-400',
    glow: '',
  },
  raro: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-sm shadow-blue-500/20',
  },
  epico: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-md shadow-purple-500/30',
  },
  lendario: {
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950',
    border: 'border-amber-400 dark:border-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-lg shadow-amber-500/40 animate-pulse',
  },
}

function BadgeIcon({ icone, className }: { icone: string; className?: string }) {
  const Icon = iconMap[icone] || Star
  return <Icon className={className} />
}

export function BadgeItem({ badge, compact = false }: { badge: Badge; compact?: boolean }) {
  const style = raridadeStyles[badge.raridade] || raridadeStyles.comum
  const isEarned = badge.is_earned

  if (compact) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
          isEarned ? style.bg : 'bg-zinc-100 dark:bg-zinc-900',
          isEarned ? style.border : 'border-zinc-300 dark:border-zinc-700',
          isEarned ? style.glow : 'opacity-40',
        )}
        title={`${badge.nome}${isEarned ? '' : ' (Bloqueado)'}`}
      >
        {isEarned ? (
          <BadgeIcon icone={badge.icone} className={cn("h-5 w-5", style.text)} />
        ) : (
          <Lock className="h-4 w-4 text-zinc-400" />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
        isEarned ? style.bg : 'bg-zinc-50 dark:bg-zinc-900',
        isEarned ? style.border : 'border-zinc-200 dark:border-zinc-800',
        isEarned ? style.glow : 'opacity-50',
      )}
    >
      {/* Ícone */}
      <div className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full",
        isEarned ? 'bg-white/50 dark:bg-black/20' : 'bg-zinc-200 dark:bg-zinc-800'
      )}>
        {isEarned ? (
          <BadgeIcon icone={badge.icone} className={cn("h-6 w-6", style.text)} />
        ) : (
          <Lock className="h-5 w-5 text-zinc-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-semibold text-sm",
            isEarned ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-500'
          )}>
            {badge.nome}
          </span>
          {isEarned && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded font-medium",
              style.bg,
              style.text
            )}>
              +{badge.xp_bonus} XP
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
          {badge.descricao}
        </p>
        {isEarned && badge.earned_at && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Conquistado em {new Date(badge.earned_at).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  )
}

export function BadgeDisplay({ badges, compact = false, showLocked = true, className }: BadgeDisplayProps) {
  const displayBadges = showLocked ? badges : badges.filter(b => b.is_earned)
  const earnedCount = badges.filter(b => b.is_earned).length
  const totalCount = badges.length

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Conquistas
          </span>
          <span className="text-xs text-zinc-500">
            {earnedCount}/{totalCount}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {displayBadges.slice(0, 8).map((badge) => (
            <BadgeItem key={badge.badge_id} badge={badge} compact />
          ))}
          {displayBadges.length > 8 && (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-500">
              +{displayBadges.length - 8}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Agrupar por categoria
  const byCategory = displayBadges.reduce((acc, badge) => {
    if (!acc[badge.categoria]) acc[badge.categoria] = []
    acc[badge.categoria].push(badge)
    return acc
  }, {} as Record<string, Badge[]>)

  const categoryNames: Record<string, string> = {
    especial: 'Especiais',
    streak: 'Streak',
    acoes: 'Ações',
    responsabilidade: 'Responsabilidade',
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Conquistas
          </h3>
          <p className="text-sm text-zinc-500">
            {earnedCount} de {totalCount} desbloqueadas
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="h-5 w-5 text-amber-500" />
          <span className="text-lg font-bold text-amber-600">{earnedCount}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${(earnedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Badges por categoria */}
      {Object.entries(byCategory).map(([categoria, categoryBadges]) => (
        <div key={categoria} className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            {categoryNames[categoria] || categoria}
          </h4>
          <div className="grid gap-3">
            {categoryBadges.map((badge) => (
              <BadgeItem key={badge.badge_id} badge={badge} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Componente para mostrar badge recém-conquistado (popup/toast)
export function NewBadgeToast({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const style = raridadeStyles[badge.raridade] || raridadeStyles.comum

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-300">
      <div className={cn(
        "relative max-w-sm w-full p-6 rounded-2xl border-2 animate-in zoom-in-95 duration-300",
        style.bg,
        style.border,
        style.glow
      )}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600"
        >
          <span className="sr-only">Fechar</span>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="text-4xl mb-2">
            {badge.raridade === 'lendario' && ''}
            {badge.raridade === 'epico' && ''}
          </div>

          <div className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
            'bg-white/50 dark:bg-black/20'
          )}>
            <BadgeIcon icone={badge.icone} className={cn("h-10 w-10", style.text)} />
          </div>

          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Nova Conquista!
          </h3>
          <p className={cn("text-lg font-semibold mb-2", style.text)}>
            {badge.nome}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {badge.descricao}
          </p>

          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            style.bg,
            style.text
          )}>
            <Zap className="h-4 w-4" />
            +{badge.xp_bonus} XP
          </div>
        </div>
      </div>
    </div>
  )
}
