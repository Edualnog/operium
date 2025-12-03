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

  const handleCheckout = () => {
    router.push("/subscribe")
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
