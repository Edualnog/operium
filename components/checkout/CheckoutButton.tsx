"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface CheckoutButtonProps {
  className?: string
  children?: React.ReactNode
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

/**
 * Componente de botão para iniciar checkout do Stripe
 * Pode ser usado em qualquer página, incluindo landing pages
 */
export default function CheckoutButton({
  className,
  children = "Assinar Agora",
  variant = "default",
  size = "default",
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleCheckout = async () => {
    setLoading(true)
    setError("")

    try {
      // Chamar API de checkout
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        // Se não estiver autenticado, redirecionar para signup com redirect para checkout
        if (response.status === 401) {
          router.push("/signup?redirect=checkout")
          return
        }
        // Se já tem assinatura, redirecionar para dashboard
        if (response.status === 400 && data.redirect) {
          router.push(data.redirect)
          return
        }
        throw new Error(data.error || "Erro ao iniciar checkout")
      }

      // Redirecionar para URL do Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("URL de checkout não retornada")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar checkout")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleCheckout}
        disabled={loading}
        className={className}
        variant={variant}
        size={size}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          children
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
