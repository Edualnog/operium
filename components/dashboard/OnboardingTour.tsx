"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Step {
    targetId: string
    title: string
    description: string
    position: "right" | "bottom" | "top" | "left"
}

const STEPS: Step[] = [
    {
        targetId: "sidebar-dashboard",
        title: "Visão Geral",
        description: "Acompanhe seus KPIs, gráficos e alertas em tempo real aqui no Dashboard.",
        position: "right"
    },
    {
        targetId: "sidebar-movimentacoes",
        title: "Movimentações",
        description: "Registre entradas, retiradas e devoluções de ferramentas e materiais.",
        position: "right"
    },
    {
        targetId: "sidebar-colaboradores",
        title: "Colaboradores",
        description: "Gerencie sua equipe, consulte históricos e rankings de responsabilidade.",
        position: "right"
    },
    {
        targetId: "sidebar-estoque",
        title: "Estoque",
        description: "Controle seu inventário de ferramentas, EPIs e consumíveis.",
        position: "right"
    },
    {
        targetId: "sidebar-conta",
        title: "Configurações",
        description: "Acesse as configurações da sua conta e preferências do sistema.",
        position: "right"
    }
]

export function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Check if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    useEffect(() => {
        // Don't show on mobile
        if (isMobile) return

        // Check if user has seen the tour
        const hasSeen = localStorage.getItem("has_seen_onboarding_v1")
        if (!hasSeen) {
            // Longer delay to ensure sidebar is fully rendered
            const timer = setTimeout(() => {
                const firstElement = document.getElementById(STEPS[0].targetId)
                if (firstElement) {
                    setIsVisible(true)
                }
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [isMobile])

    useEffect(() => {
        if (!isVisible || isMobile) return

        const updatePosition = () => {
            const step = STEPS[currentStep]
            const element = document.getElementById(step.targetId)
            if (element) {
                const rect = element.getBoundingClientRect()
                // Only set rect if element is visible (has dimensions)
                if (rect.width > 0 && rect.height > 0) {
                    setTargetRect(rect)
                } else {
                    setTargetRect(null)
                }
            } else {
                setTargetRect(null)
            }
        }

        updatePosition()
        window.addEventListener("resize", updatePosition)
        window.addEventListener("scroll", updatePosition)

        return () => {
            window.removeEventListener("resize", updatePosition)
            window.removeEventListener("scroll", updatePosition)
        }
    }, [currentStep, isVisible, isMobile])

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            handleFinish()
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const handleFinish = () => {
        setIsVisible(false)
        localStorage.setItem("has_seen_onboarding_v1", "true")
    }

    if (!isVisible) return null

    const step = STEPS[currentStep]

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] pointer-events-none">
                    {/* Backdrop with hole logic is complex, using simple overlay for focus */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 pointer-events-auto"
                        onClick={handleFinish} // Click outside to close? Or maybe disable to force interaction
                    />

                    {targetRect && (
                        <>
                            {/* Highlight Spot */}
                            <motion.div
                                layoutId="highlight"
                                className="absolute bg-transparent border-2 border-white rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                                style={{
                                    top: targetRect.top - 4,
                                    left: targetRect.left - 4,
                                    width: targetRect.width + 8,
                                    height: targetRect.height + 8,
                                    zIndex: 101
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />

                            {/* Popover Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 10, x: 20 }}
                                animate={{ opacity: 1, y: 0, x: 0 }}
                                key={currentStep}
                                className="absolute bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-6 w-[320px] pointer-events-auto"
                                style={{
                                    top: targetRect.top,
                                    left: targetRect.right + 20, // Always position to the right for sidebar
                                    zIndex: 102
                                }}
                            >
                                <button
                                    onClick={handleFinish}
                                    className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="space-y-4">
                                    <div>
                                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
                                            {currentStep + 1} de {STEPS.length}
                                        </span>
                                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                                            {step.title}
                                        </h3>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleFinish}
                                            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                        >
                                            Pular
                                        </Button>
                                        <div className="flex gap-2">
                                            {currentStep > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handlePrev}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                onClick={handleNext}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {currentStep === STEPS.length - 1 ? "Concluir" : "Próximo"}
                                                {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div
                                    className="absolute left-[-6px] top-6 w-3 h-3 bg-white dark:bg-zinc-900 border-l border-t border-zinc-200 dark:border-zinc-800 rotate-[-45deg]"
                                />
                            </motion.div>
                        </>
                    )}
                </div>
            )}
        </AnimatePresence>
    )
}
