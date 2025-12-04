"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Check,
  Zap,
  ArrowRight,
  Loader2,
  LogOut,
  Star,
  Crown
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useTranslation } from "react-i18next"
import { Suspense } from "react"

type PlanType = "mensal" | "trimestral" | "anual"

interface PlanOption {
  id: PlanType
  name: string
  priceUSD: number
  priceBRL: number
  period: string
  perMonthUSD: number
  perMonthBRL: number
  discount?: number
  badge?: string
  popular?: boolean
  bestValue?: boolean
}

function SubscribeContent() {
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [plan, setPlan] = useState<PlanType>("trimestral")
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { t, i18n } = useTranslation()

  const isPortuguese = i18n.language?.startsWith("pt")

  const plans: PlanOption[] = [
    {
      id: "mensal",
      name: isPortuguese ? "Mensal" : "Monthly",
      priceUSD: 17,
      priceBRL: 69.90,
      period: isPortuguese ? "/mês" : "/mo",
      perMonthUSD: 17,
      perMonthBRL: 69.90,
    },
    {
      id: "trimestral",
      name: isPortuguese ? "Trimestral" : "Quarterly",
      priceUSD: 45,
      priceBRL: 189.90,
      period: isPortuguese ? "/trimestre" : "/quarter",
      perMonthUSD: 15,
      perMonthBRL: 63.30,
      discount: 12,
      badge: isPortuguese ? "Mais Escolhido" : "Most Popular",
      popular: true,
    },
    {
      id: "anual",
      name: isPortuguese ? "Anual" : "Annual",
      priceUSD: 139,
      priceBRL: 597,
      period: isPortuguese ? "/ano" : "/year",
      perMonthUSD: 11.58,
      perMonthBRL: 49.75,
      discount: 32,
      badge: isPortuguese ? "Melhor Valor" : "Best Value",
      bestValue: true,
    },
  ]

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

        let isInTrial = false
        if (profile?.trial_start_date) {
          const startDate = new Date(profile.trial_start_date)
          const now = new Date()
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 7)
          isInTrial = now < endDate
        }

        if (hasActiveSubscription && !isInTrial) {
          router.push("/dashboard")
          return
        }

        setCheckingStatus(false)
      } catch (err: any) {
        console.error("Erro ao verificar assinatura:", err)
        setWarning(isPortuguese
          ? "Não consegui verificar sua assinatura agora. Você pode tentar iniciar o teste novamente."
          : "Couldn't verify your subscription. You can try starting your trial again.")
        setCheckingStatus(false)
      }
    }

    checkSubscription()
    const interval = setInterval(checkSubscription, 15000)
    return () => clearInterval(interval)
  }, [router, supabase, isPortuguese])

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

  const features = isPortuguese
    ? [
      "Estoque ilimitado",
      "Colaboradores ilimitados",
      "Ferramentas ilimitadas",
      "Relatórios avançados",
      "Dashboard industrial",
      "Movimentações completas",
      "Gestão de consertos",
      "Suporte por email"
    ]
    : [
      "Unlimited stock",
      "Unlimited collaborators",
      "Unlimited tools",
      "Advanced reports",
      "Industrial dashboard",
      "Complete movements",
      "Repair management",
      "Email support"
    ]

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-slate-600">{isPortuguese ? "Verificando sua conta..." : "Checking your account..."}</p>
          {warning && <p className="text-sm text-amber-600 text-center max-w-xs">{warning}</p>}
        </div>
      </div>
    )
  }

  const selectedPlan = plans.find(p => p.id === plan)!

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
              {isPortuguese ? "Sair" : "Logout"}
            </button>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              {isPortuguese ? "Falta só um passo!" : "Just one more step!"}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold mb-4 dark:text-zinc-50">
              {isPortuguese ? "Escolha seu plano" : "Choose your plan"}
            </h1>
            <p className="text-lg text-slate-600 dark:text-zinc-400">
              {isPortuguese
                ? <>Sua conta foi criada com sucesso! Escolha um plano e ganhe <strong>7 dias grátis</strong>.</>
                : <>Your account was created! Choose a plan and get <strong>7 days free</strong>.</>
              }
            </p>
            {warning && (
              <p className="mt-2 text-sm text-amber-700">{warning}</p>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
          >
            {plans.map((planOption) => (
              <div
                key={planOption.id}
                onClick={() => setPlan(planOption.id)}
                className={`
                  relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200
                  ${plan === planOption.id
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.02] shadow-xl shadow-blue-500/20"
                    : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-600"
                  }
                  ${planOption.popular ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-zinc-950" : ""}
                `}
              >
                {/* Badge */}
                {planOption.badge && (
                  <div className={`
                    absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                    ${planOption.popular
                      ? "bg-blue-500 text-white"
                      : "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
                    }
                  `}>
                    {planOption.popular ? <Star className="h-3 w-3" /> : <Crown className="h-3 w-3" />}
                    {planOption.badge}
                  </div>
                )}

                {/* Discount Badge */}
                {planOption.discount && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    -{planOption.discount}%
                  </div>
                )}

                <div className="text-center pt-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-2">
                    {planOption.name}
                  </h3>

                  {/* Total Price */}
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-slate-900 dark:text-zinc-100">
                      {isPortuguese
                        ? `R$${planOption.priceBRL.toFixed(2).replace(".", ",")}`
                        : `$${planOption.priceUSD}`
                      }
                    </span>
                    <span className="text-slate-500 dark:text-zinc-400 text-sm">
                      {planOption.period}
                    </span>
                  </div>

                  {/* Per Month */}
                  <div className="text-sm text-slate-500 dark:text-zinc-400 mb-4">
                    {isPortuguese
                      ? `≈ R$${planOption.perMonthBRL.toFixed(2).replace(".", ",")}/mês`
                      : `≈ $${planOption.perMonthUSD.toFixed(2)}/mo`
                    }
                  </div>

                  {/* Radio Indicator */}
                  <div className={`
                    w-5 h-5 rounded-full border-2 mx-auto transition-all
                    ${plan === planOption.id
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-300 dark:border-zinc-600"
                    }
                  `}>
                    {plan === planOption.id && (
                      <Check className="h-4 w-4 text-white m-auto" style={{ marginTop: "1px" }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Selected Plan Details & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8 max-w-2xl mx-auto"
          >
            {/* Plan Badge */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-sm font-medium">
                <Zap className="h-4 w-4" />
                {isPortuguese ? "Plano Profissional" : "Professional Plan"} - {selectedPlan.name}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
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
                  {isPortuguese ? "Redirecionando..." : "Redirecting..."}
                </>
              ) : (
                <>
                  {isPortuguese ? "Começar 7 dias grátis" : "Start 7-day free trial"}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {error && (
              <p className="mt-4 text-center text-red-600 text-sm">{error}</p>
            )}

            <p className="mt-4 text-center text-sm text-slate-500 dark:text-zinc-400">
              {isPortuguese
                ? "Cancele quando quiser. Sem compromisso."
                : "Cancel anytime. No commitment."
              }
            </p>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-500"
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {isPortuguese ? "Pagamento seguro" : "Secure payment"}
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
