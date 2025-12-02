"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Em desenvolvimento, remover qualquer service worker existente
      if (process.env.NODE_ENV !== "production") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
            console.log("🗑️ Service Worker removido em modo de desenvolvimento")
          }
        })
        return
      }

      // Registrar Service Worker apenas em produção
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ Service Worker registrado:", registration.scope)

          // Verificar atualizações periodicamente
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("🔄 Nova versão disponível!")
                }
              })
            }
          })
        })
        .catch((error) => {
          console.log("⚠️ Service Worker não registrado:", error.message)
        })
    }
  }, [])

  return null
}

