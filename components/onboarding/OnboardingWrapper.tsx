"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import OnboardingTutorial from "./OnboardingTutorial"
import { createClientComponentClient } from "@/lib/supabase-client"

const ONBOARDING_KEY = "operium_onboarding_completed"

interface OnboardingWrapperProps {
  children: React.ReactNode
}

export default function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const [showTutorial, setShowTutorial] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkOnboardingStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // Primeiro, verificar no localStorage
      const localCompleted = localStorage.getItem(ONBOARDING_KEY)

      if (localCompleted === "true") {
        setIsChecking(false)
        return
      }

      // Se não tem no localStorage, verificar se é um novo usuário
      // Checando se foi criado há menos de 24 horas
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const createdAt = new Date(user.created_at)
        const now = new Date()
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

        // Se o usuário foi criado nas últimas 24 horas e não completou o onboarding
        if (hoursSinceCreation < 24 && !localCompleted) {
          setShowTutorial(true)
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status do onboarding:", error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setShowTutorial(false)
  }

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setShowTutorial(false)
  }

  // Função para resetar o onboarding (útil para testes ou se o usuário quiser ver de novo)
  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setShowTutorial(true)
  }

  // Expor função de reset via window para debug
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).resetOnboarding = resetOnboarding
    }
  }, [])

  if (isChecking) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <AnimatePresence>
        {showTutorial && (
          <OnboardingTutorial
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        )}
      </AnimatePresence>
    </>
  )
}

