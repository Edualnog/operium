"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package,
  Users,
  Wrench,
  ArrowLeftRight,
  BarChart3,
  Hammer,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  PlayCircle
} from "lucide-react"

interface TutorialStep {
  id: number
  icon: React.ReactNode
  title: string
  description: string
  tip: string
  color: string
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    icon: <Package className="h-12 w-12" />,
    title: "Estoque & Ferramentas",
    description: "Cadastre todos os itens do seu almoxarifado: ferramentas, EPIs e consumíveis. Controle quantidades, categorias e estado de cada item.",
    tip: "Dica: Use o botão 'Importar Excel' para cadastrar vários itens de uma vez!",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
  },
  {
    id: 2,
    icon: <Users className="h-12 w-12" />,
    title: "Colaboradores",
    description: "Cadastre sua equipe para rastrear quem retirou ou devolveu cada item. Mantenha dados como cargo, telefone e foto.",
    tip: "Dica: Adicione fotos dos colaboradores para identificação rápida!",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
  },
  {
    id: 3,
    icon: <ArrowLeftRight className="h-12 w-12" />,
    title: "Movimentações",
    description: "Registre entradas, saídas e devoluções de itens. Acompanhe o histórico completo de movimentações do seu almoxarifado.",
    tip: "Dica: Use os filtros por data e colaborador para encontrar movimentações específicas!",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
  },
  {
    id: 4,
    icon: <Hammer className="h-12 w-12" />,
    title: "Consertos",
    description: "Gerencie ferramentas que estão em manutenção. Acompanhe prazos, custos e status de cada conserto.",
    tip: "Dica: Defina prioridades para organizar melhor os consertos urgentes!",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
  },
  {
    id: 5,
    icon: <BarChart3 className="h-12 w-12" />,
    title: "Dashboard & Relatórios",
    description: "Visualize KPIs importantes: itens em falta, movimentações do mês, ferramentas em conserto e muito mais.",
    tip: "Dica: O dashboard atualiza em tempo real conforme você usa o sistema!",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
  }
]

interface OnboardingTutorialProps {
  onComplete: () => void
  onSkip: () => void
}

export default function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)

  const step = tutorialSteps[currentStep]
  const isLastStep = currentStep === tutorialSteps.length - 1
  const isFirstStep = currentStep === 0

  const nextStep = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (!isFirstStep) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const goToStep = (index: number) => {
    setDirection(index > currentStep ? 1 : -1)
    setCurrentStep(index)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep()
      if (e.key === "ArrowLeft") prevStep()
      if (e.key === "Escape") onSkip()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-[#37352f] dark:bg-zinc-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-white">Bem-vindo ao Operium!</h2>
                <p className="text-zinc-300 text-sm">Conheça as principais funcionalidades</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
              title="Pular tutorial (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                  ? "w-8 bg-white"
                  : index < currentStep
                    ? "w-2 bg-white/80"
                    : "w-2 bg-white/40"
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[320px] relative overflow-hidden bg-white dark:bg-zinc-900">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div className={`p-5 rounded-2xl ${step.color} mb-6 shadow-sm border border-zinc-200 dark:border-zinc-700`}>
                {step.icon}
              </div>

              {/* Step number */}
              <div className="text-sm text-slate-400 dark:text-zinc-500 mb-2">
                Passo {step.id} de {tutorialSteps.length}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-3">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-slate-600 dark:text-zinc-400 mb-6 max-w-md leading-relaxed">
                {step.description}
              </p>

              {/* Tip */}
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 text-sm max-w-md">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">💡</span> {step.tip}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 dark:bg-zinc-800 border-t border-slate-100 dark:border-zinc-700 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 font-medium transition-colors"
          >
            Pular tutorial
          </button>

          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
            )}

            <button
              onClick={nextStep}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${isLastStep
                ? "bg-[#37352f] dark:bg-zinc-700 text-white hover:bg-[#2f2e29] dark:hover:bg-zinc-600"
                : "bg-[#37352f] dark:bg-zinc-700 text-white hover:bg-[#2f2e29] dark:hover:bg-zinc-600"
                }`}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Começar a usar
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="px-8 py-3 bg-slate-100 dark:bg-zinc-800 text-center">
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Use as setas ← → para navegar • Enter para avançar • Esc para pular
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

