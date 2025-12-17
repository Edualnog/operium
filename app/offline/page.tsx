"use client"

import { WifiOff, RefreshCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function OfflinePage() {
  const router = useRouter()

  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícone animado */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-25" />
          <div className="relative bg-amber-100 rounded-full w-24 h-24 flex items-center justify-center">
            <WifiOff className="h-12 w-12 text-amber-600" />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900">
            Você está offline
          </h1>
          <p className="text-zinc-600">
            Não foi possível conectar à internet. Verifique sua conexão e tente novamente.
          </p>
        </div>

        {/* Dicas */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-zinc-200 text-left">
          <p className="text-sm font-medium text-zinc-700 mb-2">Dicas:</p>
          <ul className="text-sm text-zinc-600 space-y-1">
            <li>• Verifique se o Wi-Fi está conectado</li>
            <li>• Tente desligar e ligar o Wi-Fi</li>
            <li>• Verifique se outros sites funcionam</li>
          </ul>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={handleGoHome} className="gap-2">
            <Home className="h-4 w-4" />
            Página inicial
          </Button>
        </div>

        {/* Info do App */}
        <div className="pt-6 border-t border-zinc-200">
          <p className="text-xs text-zinc-400">
            Operium • Gestão de Almoxarifado
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            As páginas visitadas anteriormente podem estar disponíveis no cache
          </p>
        </div>
      </div>
    </div>
  )
}

