import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica se o usuário está no período de trial grátis (7 dias)
 * @param trialStartDate Data de início do trial
 * @returns Objeto com informações sobre o status do trial
 */
export function checkTrialStatus(trialStartDate: string | null | undefined) {
  if (!trialStartDate) {
    return {
      isInTrial: false,
      daysRemaining: 0,
      trialEnded: true,
      shouldShowCheckout: true,
    }
  }

  const startDate = new Date(trialStartDate)
  const now = new Date()
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 7) // 7 dias de trial

  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const isInTrial = diffDays > 0
  const daysRemaining = Math.max(0, diffDays)
  const trialEnded = diffDays <= 0
  // Mostrar checkout quando faltam 2 dias ou menos, ou quando o trial acabou
  const shouldShowCheckout = diffDays <= 2

  return {
    isInTrial,
    daysRemaining,
    trialEnded,
    shouldShowCheckout,
    trialEndDate: endDate,
  }
}

