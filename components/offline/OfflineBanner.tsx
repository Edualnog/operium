"use client"

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus"
import { WifiOff, Wifi, X } from "lucide-react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed quando mudar o status
  useEffect(() => {
    if (!isOnline) {
      setDismissed(false)
    }
  }, [isOnline])

  // Não mostrar nada se está online e não acabou de voltar
  if (isOnline && !wasOffline) return null

  // Se foi dispensado, não mostrar
  if (dismissed && isOnline) return null

  return (
    <AnimatePresence>
      {(!isOnline || wasOffline) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 500 }}
          className={`fixed top-0 left-0 right-0 z-[100] px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium shadow-lg ${
            isOnline
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 animate-pulse" />
                <span>Conexão restaurada! Seus dados estão sincronizados.</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Você está offline. Os dados exibidos podem estar desatualizados.</span>
              </>
            )}
          </div>
          
          {isOnline && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

