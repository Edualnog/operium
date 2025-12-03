"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, ArrowRight, Building2, Package, TrendingUp, PartyPopper } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

interface OnboardingChecklistProps {
    userId: string
}

export function OnboardingChecklist({ userId }: OnboardingChecklistProps) {
    const [steps, setSteps] = useState([
        {
            id: "company",
            label: "Criar sua empresa",
            description: "Configure os dados do seu negócio",
            completed: false,
            icon: Building2,
            actionLabel: "Configurações",
            actionUrl: "/dashboard/conta",
        },
        {
            id: "products",
            label: "Adicionar produtos",
            description: "Cadastre seus primeiros itens no estoque",
            completed: false,
            icon: Package,
            actionLabel: "Adicionar",
            actionUrl: "/dashboard/estoque",
        },
        {
            id: "transaction",
            label: "Registrar transação",
            description: "Faça sua primeira movimentação de entrada ou saída",
            completed: false,
            icon: TrendingUp,
            actionLabel: "Movimentar",
            actionUrl: "/dashboard/movimentacoes",
        },
    ])
    const [loading, setLoading] = useState(true)
    const [completedAll, setCompletedAll] = useState(false)
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        async function checkProgress() {
            if (!userId) return

            try {
                const supabase = createClientComponentClient()

                // 1. Check Company (Profile has company_name)
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("company_name")
                    .eq("id", userId)
                    .single()

                const hasCompany = !!profile?.company_name

                // 2. Check Products (Count > 0)
                const { count: productsCount } = await supabase
                    .from("ferramentas")
                    .select("*", { count: "exact", head: true })
                    .eq("profile_id", userId)

                const hasProducts = (productsCount || 0) > 0

                // 3. Check Transactions (Count > 0)
                const { count: transactionsCount } = await supabase
                    .from("movimentacoes")
                    .select("*", { count: "exact", head: true })
                    .eq("profile_id", userId)

                const hasTransactions = (transactionsCount || 0) > 0

                setSteps((prev) =>
                    prev.map((step) => {
                        if (step.id === "company") return { ...step, completed: hasCompany }
                        if (step.id === "products") return { ...step, completed: hasProducts }
                        if (step.id === "transaction") return { ...step, completed: hasTransactions }
                        return step
                    })
                )

                const allDone = hasCompany && hasProducts && hasTransactions
                setCompletedAll(allDone)

                // Check if user has already seen the success message
                const hasSeen = localStorage.getItem(`onboarding_seen_${userId}`)
                if (hasSeen) {
                    setIsVisible(false)
                }

                // Se já completou tudo há muito tempo, talvez não queira mostrar sempre?
                // Por enquanto, vamos mostrar sempre que carregar, mas com opção de minimizar ou algo assim no futuro.
                // O requisito diz "Mostrar visual de progresso", então manteremos visível.

                if (allDone && !completedAll && !hasSeen) {
                    // Trigger confetti only on the transition to completed AND if not seen before
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    })
                }

            } catch (error) {
                console.error("Erro ao verificar progresso do onboarding:", error)
            } finally {
                setLoading(false)
            }
        }

        checkProgress()
    }, [userId, completedAll])

    const handleClose = () => {
        localStorage.setItem(`onboarding_seen_${userId}`, 'true')
        setIsVisible(false)
    }

    // Se estiver carregando, mostra skeleton ou nada? Vamos mostrar skeleton básico.
    if (loading) {
        return (
            <Card className="mb-8 border-blue-100 bg-gradient-to-r from-blue-50 to-white">
                <CardContent className="p-6">
                    <div className="h-6 w-48 bg-blue-100 rounded animate-pulse mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 w-full bg-white rounded-lg animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Se completou tudo, mostra card de sucesso compactado ou some?
    // Requisito: "Feedback positivo quando completar".
    if (completedAll) {
        if (!isVisible) return null

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8"
            >
                <Card className="border-green-200 bg-gradient-to-r from-green-50 to-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <PartyPopper className="w-32 h-32 text-green-600" />
                    </div>
                    <CardContent className="p-6 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-green-900 text-lg">Parabéns! Você completou o setup inicial.</h3>
                                <p className="text-green-700">Sua empresa está pronta para operar com eficiência máxima.</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-700 hover:text-green-800 hover:bg-green-100"
                            onClick={handleClose}
                        >
                            Fechar
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        )
    }

    const completedCount = steps.filter((s) => s.completed).length
    const progress = (completedCount / steps.length) * 100

    return (
        <Card className="mb-8 border-blue-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-blue-50 bg-blue-50/30">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 text-center sm:text-left">
                    <div>
                        <CardTitle className="text-lg font-semibold text-blue-950 flex items-center justify-center sm:justify-start gap-2">
                            🚀 Primeiros Passos
                        </CardTitle>
                        <p className="text-sm text-blue-600/80 mt-1">
                            Complete o setup para aproveitar todo o potencial do sistema
                        </p>
                    </div>
                    <div className="text-center sm:text-right w-full sm:w-auto bg-white/50 sm:bg-transparent p-2 rounded-lg sm:p-0">
                        <div className="flex items-center justify-center sm:justify-end gap-2 sm:block">
                            <span className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</span>
                            <span className="text-xs text-blue-400 font-medium uppercase tracking-wider sm:block ml-2 sm:ml-0">Concluído</span>
                        </div>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-2 w-full bg-blue-100 rounded-full mt-4 overflow-hidden">
                    <motion.div
                        className="h-full bg-blue-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-blue-50">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-colors text-center sm:text-left ${step.completed ? "bg-blue-50/10" : "hover:bg-slate-50"
                                }`}
                        >
                            {/* Icon Status */}
                            <div className="shrink-0">
                                {step.completed ? (
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                                        <Circle className="w-5 h-5" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 w-full">
                                <h4 className={`font-medium ${step.completed ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900"}`}>
                                    {step.label}
                                </h4>
                                <p className="text-sm text-slate-500 whitespace-normal sm:truncate">{step.description}</p>
                            </div>

                            {/* Action */}
                            <div className="shrink-0 w-full sm:w-auto">
                                {step.completed ? (
                                    <span className="flex items-center justify-center text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 mx-auto sm:mx-0 w-fit">
                                        Feito
                                    </span>
                                ) : (
                                    <Button asChild size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200">
                                        <Link href={step.actionUrl} className="flex items-center justify-center gap-1.5">
                                            {step.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
