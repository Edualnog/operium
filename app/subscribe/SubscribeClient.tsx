"use client"




import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Check,
  Zap,
  ArrowRight,
  Loader2,
  LogOut
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"

import { Suspense } from "react"

function SubscribeContent() {
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [plan, setPlan] = useState<"mensal" | "anual">("anual")
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          router.push("/login")
          return
        }

        // Verificar se já tem assinatura ativa, passou pelo checkout ou está no trial
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("subscription_status, stripe_customer_id, trial_start_date")
          .eq("id", user.id)
          .single()

        if (profileError) {
          throw profileError
        }

        const activeStatuses = ["active", "trialing"]
        const hasActiveSubscription = profile?.subscription_status && activeStatuses.includes(profile.subscription_status)
        const hasStripeCustomer = !!profile?.stripe_customer_id

        // Verificar se está no período de trial
        let isInTrial = false
        if (profile?.trial_start_date) {
          const startDate = new Date(profile.trial_start_date)
          const now = new Date()
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 7) // 7 dias de trial
          isInTrial = now < endDate
        }

        // Se já tem assinatura ativa (não trial), vai para dashboard
        // Se estiver em trial, PERMITE ficar na página para fazer upgrade/assinar
        if (hasActiveSubscription && !isInTrial) {
          router.push("/dashboard")
          return
        }

        setCheckingStatus(false)
      } catch (err: any) {
        console.error("Erro ao verificar assinatura:", err)
        setWarning("Não consegui verificar sua assinatura agora. Você pode tentar iniciar o teste novamente.")
        setCheckingStatus(false)
      }
    }

    checkSubscription()

    // Verificar periodicamente se o status mudou (após webhook)
    const interval = setInterval(checkSubscription, 15000)
    return () => clearInterval(interval)
  }, [router, supabase])

  const handleCheckout = async () => {
    setLoading(true)
    setError("")
    setWarning("")

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao iniciar checkout")
      }

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const features = [
    "Estoque ilimitado",
    "Colaboradores ilimitados",
    "Ferramentas ilimitadas",
    "Relatórios avançados",
    "Dashboard industrial",
    "Movimentações completas",
    "Gestão de consertos",
    "Suporte por email"
  ]

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-600">Verificando sua conta...</p>
          {warning && <p className="text-sm text-amber-600 text-center max-w-xs">{warning}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(0 0 0)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-zinc-800/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[#4B6BFB] shadow-lg shadow-blue-500/25">
                <svg className="h-7 w-7" viewBox="0 0 500 500" fill="none">
                  <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight">Almox Fácil</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Falta só um passo!
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-4 dark:text-zinc-50">
              Ative seu período de teste
            </h1>
            <p className="text-lg text-slate-600 dark:text-zinc-400">
              Sua conta foi criada com sucesso! Agora ative os <strong>7 dias grátis</strong> para acessar todas as funcionalidades.
            </p>
            {warning && (
              <p className="mt-2 text-sm text-amber-700">{warning}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8"
          >
            {/* Plan Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl inline-flex relative">
                <button
                  onClick={() => setPlan("mensal")}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${plan === "mensal"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setPlan("anual")}
                  className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${plan === "anual"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                >
                  Anual
                  <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full dark:bg-green-900/30 dark:text-green-400">
                    -33%
                  </span>
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="text-center mb-8 pb-8 border-b border-slate-200">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
                <Zap className="h-4 w-4" />
                Plano Profissional
              </div>
              <div className="flex items-baseline justify-center gap-2">
                {plan === "anual" ? (
                  <>
                    <span className="text-xl text-slate-400 line-through">R$59,90</span>
                    <span className="text-5xl font-bold text-slate-900 dark:text-zinc-50">R$39,90</span>
                  </>
                ) : (
                  <span className="text-5xl font-bold text-slate-900 dark:text-zinc-50">R$59,90</span>
                )}
                <span className="text-slate-500 dark:text-zinc-400">/mês</span>
              </div>

              {plan === "anual" && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                    Economize R$ 240/ano
                  </span>
                </div>
              )}

              <p className="mt-2 text-slate-500">
                {plan === "anual"
                  ? "Cobrado anualmente (R$ 478,80)"
                  : "Cobrado mensalmente"}
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-sm text-slate-700 dark:text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecionando...
                </>
              ) : (
                <>
                  Começar 7 dias grátis
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {error && (
              <p className="mt-4 text-center text-red-600 text-sm">{error}</p>
            )}

            <p className="mt-4 text-center text-sm text-slate-500">
              Cancele quando quiser. Sem compromisso.
            </p>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-500"
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Pagamento seguro
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              SSL 256-bit
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

export default function SubscribeClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <SubscribeContent />
    </Suspense>
  )
}
