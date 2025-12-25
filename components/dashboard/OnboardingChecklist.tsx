"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Circle, ArrowRight, Building2, Package, TrendingUp, PartyPopper, Users } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { useTranslation } from "react-i18next"

interface OnboardingChecklistProps {
    userId: string
}

export function OnboardingChecklist({ userId }: OnboardingChecklistProps) {
    const { t } = useTranslation('common')
    const [steps, setSteps] = useState([
        {
            id: "company",
            label: t('onboarding.steps.company.label'),
            description: t('onboarding.steps.company.desc'),
            completed: false,
            icon: Building2,
            actionLabel: t('onboarding.steps.company.action'),
            actionUrl: "/dashboard/conta",
        },
        {
            id: "products",
            label: t('onboarding.steps.products.label'),
            description: t('onboarding.steps.products.desc'),
            completed: false,
            icon: Package,
            actionLabel: t('onboarding.steps.products.action'),
            actionUrl: "/dashboard/estoque",
        },
        {
            id: "employees",
            label: t('onboarding.steps.employees.label'),
            description: t('onboarding.steps.employees.desc'),
            completed: false,
            icon: Users,
            actionLabel: t('onboarding.steps.employees.action'),
            actionUrl: "/dashboard/colaboradores",
        },
        {
            id: "transaction",
            label: t('onboarding.steps.transaction.label'),
            description: t('onboarding.steps.transaction.desc'),
            completed: false,
            icon: TrendingUp,
            actionLabel: t('onboarding.steps.transaction.action'),
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

                // 4. Check Employees (Count > 0)
                const { count: employeesCount } = await supabase
                    .from("colaboradores")
                    .select("*", { count: "exact", head: true })
                    .eq("profile_id", userId)

                const hasEmployees = (employeesCount || 0) > 0

                setSteps((prev) =>
                    prev.map((step) => {
                        if (step.id === "company") return { ...step, completed: hasCompany }
                        if (step.id === "products") return { ...step, completed: hasProducts }
                        if (step.id === "transaction") return { ...step, completed: hasTransactions }
                        if (step.id === "employees") return { ...step, completed: hasEmployees }
                        return step
                    })
                )

                const allDone = hasCompany && hasProducts && hasTransactions && hasEmployees
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
                    // Mark as seen automatically so it doesn't show on next reload
                    localStorage.setItem(`onboarding_seen_${userId}`, 'true')
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

    // Se estiver carregando, mostra skeleton
    if (loading) {
        return (
            <Card className="mb-8 border-zinc-100 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                <CardContent className="p-6">
                    <div className="h-6 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 w-full bg-zinc-50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Se completou tudo
    if (completedAll) {
        if (!isVisible) return null

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8"
            >
                <Card className="border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 overflow-hidden relative shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-md">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-serif font-medium text-zinc-900 dark:text-zinc-100 text-xl">{t('onboarding.success.title')}</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">{t('onboarding.success.desc')}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            onClick={handleClose}
                        >
                            {t('common.close')}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        )
    }

    const completedCount = steps.filter((s) => s.completed).length
    const progress = (completedCount / steps.length) * 100

    return (

        <Card className="mb-8 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden rounded-xl">
            <CardHeader className="pb-6 pt-6 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 text-center sm:text-left">
                    <div>
                        <CardTitle className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-center sm:justify-start gap-3">
                            🚀 {t('onboarding.title')}
                        </CardTitle>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-light">
                            {t('onboarding.subtitle')}
                        </p>
                    </div>
                    <div className="text-center sm:text-right w-full sm:w-auto">
                        <div className="flex items-center justify-center sm:justify-end gap-3 sm:block">
                            <span className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100">{Math.round(progress)}%</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest sm:block ml-2 sm:ml-0 mt-1">{t('onboarding.completed')}</span>
                        </div>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full mt-6 overflow-hidden">
                    <motion.div
                        className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
                {progress < 100 && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center mt-3 font-medium uppercase tracking-wider">
                        {t('onboarding.progress_text')}
                    </p>
                )}
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5 transition-colors text-center sm:text-left ${step.completed ? "bg-zinc-50/50 dark:bg-zinc-800/30" : "hover:bg-zinc-50/30 dark:hover:bg-zinc-800/20"
                                }`}
                        >
                            {/* Icon Status */}
                            <div className="shrink-0 pt-1">
                                {step.completed ? (
                                    <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="h-10 w-10 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-sm">
                                        <step.icon className="w-5 h-5" strokeWidth={1.5} />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 w-full">
                                <h4 className={`font-medium text-base ${step.completed ? "text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-600" : "text-zinc-900 dark:text-zinc-100"}`}>
                                    {step.label}
                                </h4>
                                <p className={`text-sm mt-1 whitespace-normal sm:truncate ${step.completed ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}>{step.description}</p>
                            </div>

                            {/* Action */}
                            <div className="shrink-0 w-full sm:w-auto">
                                {step.completed ? (
                                    <span className="flex items-center justify-center text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 mx-auto sm:mx-0 w-fit">
                                        {t('common.done')}
                                    </span>
                                ) : (
                                    <Button asChild size="sm" className="w-full sm:w-auto bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 shadow-md shadow-zinc-200 dark:shadow-zinc-900 font-medium px-5">
                                        <Link href={step.actionUrl} className="flex items-center justify-center gap-2">
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
