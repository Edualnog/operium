"use client"

import { useState, useEffect, useCallback } from "react"

interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean // True se estava offline e voltou
  lastOnlineAt: Date | null
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null)

  const handleOnline = useCallback(() => {
    setIsOnline(true)
    setLastOnlineAt(new Date())
    // Se estava offline, marca que voltou
    if (!isOnline) {
      setWasOffline(true)
      // Remove o indicador "voltou online" após 5 segundos
      setTimeout(() => setWasOffline(false), 5000)
    }
  }, [isOnline])

  const handleOffline = useCallback(() => {
    setIsOnline(false)
  }, [])

  useEffect(() => {
    // Verificar estado inicial
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine)
      if (navigator.onLine) {
        setLastOnlineAt(new Date())
      }
    }

    // Adicionar listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [handleOnline, handleOffline])

  return { isOnline, wasOffline, lastOnlineAt }
}

// Hook simplificado que retorna apenas boolean
export function useIsOnline(): boolean {
  const { isOnline } = useOnlineStatus()
  return isOnline
}

