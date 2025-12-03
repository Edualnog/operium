"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { checkTrialStatus } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Clock, CreditCard } from "lucide-react"

interface TrialCheckoutPromptProps {
  userId: string
}

export default function TrialCheckoutPrompt({ userId }: TrialCheckoutPromptProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = React.useState(false)
  const [trialInfo, setTrialInfo] = React.useState<{
    isInTrial: boolean
    daysRemaining: number
    trialEnded: boolean
    shouldShowCheckout: boolean
    trialEndDate?: Date
  } | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<string | null>(null)

  React.useEffect(() => {
    const checkTrial = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_start_date, subscription_status")
        .eq("id", userId)
        .single()

      if (profile) {
        setSubscriptionStatus(profile.subscription_status)
        const trialStatus = checkTrialStatus(profile.trial_start_date)
        setTrialInfo(trialStatus)
      }
    }

    checkTrial()
  }, [userId, supabase])

  const handleCheckout = () => {
    window.location.href = "/subscribe"
  }

  // Não mostrar nada se já tem assinatura ativa
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    return null
  }

  // Não mostrar nada se não tem info do trial
  if (!trialInfo) {
    return null
  }

  // Definir cores e ícones baseados na urgência
  let alertStyles = "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800"
  let iconStyles = "text-blue-600 dark:text-blue-400"
  let titleStyles = "text-blue-900 dark:text-blue-100"
  let descStyles = "text-blue-800 dark:text-blue-200"
  let buttonStyles = "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"

  if (trialInfo.trialEnded) {
    alertStyles = "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
    iconStyles = "text-red-600 dark:text-red-400"
    titleStyles = "text-red-900 dark:text-red-100"
    descStyles = "text-red-800 dark:text-red-200"
    buttonStyles = "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
  } else if (trialInfo.daysRemaining <= 2) {
    alertStyles = "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
    iconStyles = "text-amber-600 dark:text-amber-400"
    titleStyles = "text-amber-900 dark:text-amber-100"
    descStyles = "text-amber-800 dark:text-amber-200"
    buttonStyles = "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
  }

  // Mostrar aviso sempre que estiver no trial ou acabou
  return (
    <Alert className={`mb-6 ${alertStyles}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
        {trialInfo.trialEnded ? (
          <AlertCircle className={`h-8 w-8 sm:h-5 sm:w-5 mt-0.5 ${iconStyles}`} />
        ) : (
          <Clock className={`h-8 w-8 sm:h-5 sm:w-5 mt-0.5 ${iconStyles}`} />
        )}
        <div className="flex-1 w-full">
          <AlertTitle className={`font-semibold text-lg ${titleStyles}`}>
            {trialInfo.trialEnded
              ? "Seu período de teste grátis acabou"
              : trialInfo.daysRemaining === 1
                ? "Último dia do seu teste grátis!"
                : `Faltam ${trialInfo.daysRemaining} dias do seu teste grátis`}
          </AlertTitle>
          <AlertDescription className={`mt-2 ${descStyles}`}>
            <div className="flex flex-col items-center sm:items-start sm:flex-row sm:justify-between gap-4">
              <p>
                {trialInfo.trialEnded
                  ? "Para continuar usando todas as funcionalidades, ative sua assinatura agora."
                  : "Aproveite para testar todas as funcionalidades do sistema."}
              </p>
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className={`${buttonStyles} text-white whitespace-nowrap w-full sm:w-auto`}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Ativar Assinatura Agora
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

