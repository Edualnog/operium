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
import { useToast } from "@/components/ui/toast-context"
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
  const { toast } = useToast()

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
        body: JSON.stringify({ plan, locale: isPortuguese ? "pt-BR" : "en" }),
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
      const msg = err.message || "Erro ao processar checkout"
      setError(msg)
      toast.error(msg)
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Premium Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-b border-white/20 dark:border-zinc-800/50 supports-[backdrop-filter]:bg-white/60">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="p-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                <svg className="h-6 w-6" viewBox="0 0 500 500" fill="none">
                  <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Almox Fácil</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
            >
              <LogOut className="h-4 w-4" />
              {isPortuguese ? "Sair" : "Logout"}
            </button>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-8 backdrop-blur-sm"
            >
              <Zap className="h-4 w-4 fill-current" />
              {isPortuguese ? "Comece agora seu teste grátis" : "Start your free trial now"}
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 tracking-tight text-slate-900 dark:text-white">
              {isPortuguese ? "Escolha o plano ideal" : "Choose the perfect plan"}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mt-2">
                {isPortuguese ? "para o seu negócio" : "for your business"}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              {isPortuguese
                ? "Desbloqueie todo o potencial do seu almoxarifado. Sem compromisso, cancele quando quiser."
                : "Unlock the full potential of your warehouse. No commitment, cancel anytime."
              }
            </p>
            {warning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm inline-block"
              >
                {warning}
              </motion.div>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-center">
            {plans.map((planOption, index) => (
              <motion.div
                key={planOption.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                onClick={() => setPlan(planOption.id)}
                className={`
                  relative cursor-pointer rounded-3xl p-8 transition-all duration-300 group
                  ${plan === planOption.id
                    ? "bg-white dark:bg-zinc-800 ring-2 ring-blue-500 shadow-2xl shadow-blue-500/20 scale-105 z-10"
                    : "bg-white dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-zinc-600 hover:scale-[1.02] hover:shadow-xl"
                  }
                  backdrop-blur-xl
                `}
              >
                {/* Popular Badge */}
                {planOption.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/30 flex items-center gap-1.5 tracking-wide uppercase">
                    <Star className="h-3 w-3 fill-white" />
                    {planOption.badge}
                  </div>
                )}

                {/* Best Value Badge */}
                {planOption.bestValue && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/30 flex items-center gap-1.5 tracking-wide uppercase">
                    <Crown className="h-3 w-3 fill-white" />
                    {planOption.badge}
                  </div>
                )}

                {/* Discount Badge */}
                {planOption.discount && (
                  <div className="absolute top-4 right-4 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full border border-green-500/20">
                    -{planOption.discount}%
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    {planOption.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {isPortuguese
                        ? `R$${planOption.priceBRL.toFixed(0)}`
                        : `$${planOption.priceUSD}`
                      }
                    </span>
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">
                      {planOption.period}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-zinc-500 mt-2">
                    {isPortuguese
                      ? `Equivalente a R$${planOption.perMonthBRL.toFixed(2).replace(".", ",")}/mês`
                      : `Equivalent to $${planOption.perMonthUSD.toFixed(2)}/mo`
                    }
                  </div>
                </div>

                {/* Selection Indicator */}
                <div className={`
                  w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 font-medium
                  ${plan === planOption.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  }
                `}>
                  {plan === planOption.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      {isPortuguese ? "Selecionado" : "Selected"}
                    </>
                  ) : (
                    isPortuguese ? "Selecionar" : "Select"
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Features & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="max-w-3xl mx-auto bg-white dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-zinc-700 p-8 sm:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none"
          >
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {isPortuguese ? "Tudo incluído no plano Profissional" : "Everything included in Professional plan"}
              </h3>
              <p className="text-slate-500 dark:text-zinc-400">
                {isPortuguese ? "Acesso total a todas as funcionalidades do sistema" : "Full access to all system features"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-10">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-slate-700 dark:text-zinc-300 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isPortuguese ? "Preparando seu ambiente..." : "Setting up your environment..."}
                </>
              ) : (
                <>
                  {isPortuguese ? "Começar 7 dias grátis" : "Start 7-day free trial"}
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-zinc-500 flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {isPortuguese
                ? "Pagamento seguro via Stripe. Cancele a qualquer momento."
                : "Secure payment via Stripe. Cancel anytime."
              }
            </p>
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
