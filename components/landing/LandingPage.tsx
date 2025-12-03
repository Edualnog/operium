"use client"

import { useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  Zap,
  Shield,
  Clock,
  Menu,
  X,
  Loader2,
  PlayCircle,
  Star,
  TrendingUp,
  LayoutDashboard,
  Box,
  Users,
  AlertTriangle,
  Smartphone,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"

// Ícones SVG elegantes para redes sociais
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

interface LandingPageProps {
  isLoggedIn: boolean
  hasSubscription: boolean
  userEmail?: string
}

export default function LandingPage({ isLoggedIn, hasSubscription, userEmail }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const router = useRouter()

  const handleStart = () => {
    setCheckoutLoading(true)
    if (isLoggedIn) {
      router.push("/dashboard")
    } else {
      router.push("/signup")
    }
  }

  const painPoints = [
    {
      icon: AlertTriangle,
      title: "Ferramentas que somem",
      description: "Você compra, usa uma vez e ninguém sabe onde foi parar. O prejuízo é silencioso, mas constante."
    },
    {
      icon: Clock,
      title: "Planilhas desatualizadas",
      description: "A planilha nunca bate com o real. Você perde horas contando estoque e ainda assim tem furos."
    },
    {
      icon: TrendingUp,
      title: "Compras de emergência",
      description: "Acaba o material no meio da obra ou serviço. Você paga mais caro para repor com urgência."
    }
  ]

  const benefits = [
    {
      icon: Smartphone,
      title: "Controle na palma da mão",
      description: "Registre entradas e saídas pelo celular, direto do local de trabalho. Sem burocracia."
    },
    {
      icon: Shield,
      title: "Fim da 'ferramenta sumida'",
      description: "Saiba exatamente quem pegou, quando e se já devolveu. Responsabilize sua equipe."
    },
    {
      icon: Zap,
      title: "Alertas automáticos",
      description: "O sistema avisa quando o estoque está baixo ou EPIs estão vencendo. Zero surpresas."
    }
  ]

  const testimonials = [
    {
      name: "Ricardo Silva",
      role: "Dono",
      company: "Mecânica Silva",
      content: "Eu perdia uns 500 reais por mês só com ferramenta pequena sumindo. O Almox Fácil se pagou na primeira semana."
    },
    {
      name: "Ana Paula",
      role: "Gestora",
      company: "AP Construções",
      content: "Tentei usar 3 sistemas diferentes, todos muito complicados. Esse aqui minha equipe aprendeu a usar em 10 minutos."
    },
    {
      name: "Carlos Eduardo",
      role: "Sócio",
      company: "Instalações Express",
      content: "O controle de EPIs é sensacional. O sistema avisa antes de vencer, nunca mais paguei multa ou corri risco."
    }
  ]

  const partners = [
    {
      id: 1,
      name: "João Silva",
      designation: "CEO da TechFix",
      image: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3387&q=80",
    },
    {
      id: 2,
      name: "Maria Santos",
      designation: "Diretora da ConstruMax",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 3,
      name: "Pedro Costa",
      designation: "Gerente da EletroFast",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 4,
      name: "Ana Oliveira",
      designation: "Sócia da Mecânica Sul",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
    },
    {
      id: 5,
      name: "Carlos Souza",
      designation: "Dono da Refrigeração Z",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3540&q=80",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Logo Almox Fácil"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Almox Fácil</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#problemas" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Problemas</a>
            <a href="#solucao" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Solução</a>
            <a href="#depoimentos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Depoimentos</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm font-medium text-slate-700 hover:text-blue-600">
                Ir para Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-blue-600">
                Entrar
              </Link>
            )}
            <RainbowButton
              onClick={handleStart}
              className="px-5 py-2.5 h-auto text-sm font-semibold rounded-xl"
            >
              Começar Grátis
            </RainbowButton>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-100 p-4 shadow-xl"
          >
            <div className="flex flex-col gap-4">
              <a href="#problemas" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">Problemas</a>
              <a href="#solucao" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">Solução</a>
              <a href="#depoimentos" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">Depoimentos</a>
              <hr className="border-slate-100" />
              <Link href="/login" className="text-slate-600 font-medium">Entrar</Link>
              <RainbowButton
                onClick={handleStart}
                className="w-full h-auto py-3 font-semibold rounded-xl"
              >
                Começar Grátis
              </RainbowButton>
            </div>
          </motion.div>
        )}
      </header>

      <main>
        {/* Hero Section with Scroll Animation */}
        <section className="pt-20 pb-10 bg-white overflow-hidden">
          <div className="flex flex-col overflow-hidden">
            <ContainerScroll
              titleComponent={
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-5xl mx-auto text-center"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold mb-8 uppercase tracking-wide">
                      <Star className="h-3 w-3 fill-current" />
                      Mais de 200 empresas já organizaram a casa
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                      Pare de perder dinheiro com <span className="text-blue-600">ferramentas sumidas</span> e estoque parado.
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                      O sistema de gestão mais simples do Brasil para pequenas empresas organizarem o almoxarifado, controlarem EPIs e acabarem com as planilhas.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                      <RainbowButton
                        onClick={handleStart}
                        disabled={checkoutLoading}
                        className="w-full sm:w-auto h-auto px-8 py-4 text-lg font-bold flex items-center justify-center gap-2 rounded-xl"
                      >
                        {checkoutLoading ? <Loader2 className="animate-spin" /> : "Começar teste grátis agora"}
                        {!checkoutLoading && <ArrowRight className="h-5 w-5" />}
                      </RainbowButton>
                      <p className="text-sm text-slate-500 font-medium">
                        Sem cartão de crédito • Cancele quando quiser
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4 mb-8">
                      <p className="text-sm text-slate-500 font-medium">Empresas parceiras que confiam no Almox Fácil</p>
                      <div className="flex flex-row items-center justify-center w-full">
                        <AnimatedTooltip items={partners} />
                      </div>
                    </div>
                  </motion.div>
                </>
              }
            >
              <div className="w-full h-full relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-20" />

                {/* Header Mockup */}
                <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Box className="text-white h-5 w-5" />
                    </div>
                    <div className="w-32 h-4 bg-slate-800 rounded" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-full" />
                    <div className="w-8 h-8 bg-slate-800 rounded-full" />
                  </div>
                </div>

                {/* Content Mockup */}
                <div className="p-6 grid grid-cols-12 gap-6 relative z-10">
                  <div className="col-span-3 hidden md:block space-y-4">
                    <div className="h-10 bg-blue-600/10 border border-blue-600/20 rounded-lg w-full flex items-center px-3 gap-2">
                      <LayoutDashboard className="h-4 w-4 text-blue-500" />
                      <div className="h-2 w-20 bg-blue-600/20 rounded" />
                    </div>
                    <div className="h-8 bg-slate-800/50 rounded-lg w-full" />
                    <div className="h-8 bg-slate-800/50 rounded-lg w-full" />
                    <div className="h-8 bg-slate-800/50 rounded-lg w-full" />
                  </div>
                  <div className="col-span-12 md:col-span-9 space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-24 flex flex-col justify-between">
                        <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Box className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="h-2 w-16 bg-slate-700 rounded" />
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-24 flex flex-col justify-between">
                        <div className="h-8 w-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="h-2 w-16 bg-slate-700 rounded" />
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-24 flex flex-col justify-between">
                        <div className="h-8 w-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-orange-400" />
                        </div>
                        <div className="h-2 w-16 bg-slate-700 rounded" />
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 h-24 flex flex-col justify-between">
                        <div className="h-8 w-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="h-2 w-16 bg-slate-700 rounded" />
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 h-64 p-4">
                      <div className="w-full h-8 bg-slate-800 rounded mb-4 flex items-center justify-between px-2">
                        <div className="h-3 w-24 bg-slate-700 rounded" />
                        <div className="h-6 w-20 bg-blue-600 rounded text-[10px] text-white flex items-center justify-center font-bold">Nova Saída</div>
                      </div>
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="w-full h-10 border-b border-slate-700/50 flex items-center gap-4">
                            <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center">
                              <Box className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="w-1/3 h-3 bg-slate-700 rounded" />
                            <div className="w-1/4 h-3 bg-slate-800 rounded ml-auto" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute bottom-8 right-8 bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 animate-bounce z-20">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <Check className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Estoque atualizado</p>
                    <p className="font-bold text-white">Agora mesmo</p>
                  </div>
                </div>
              </div>
            </ContainerScroll>
          </div>
        </section>

        {/* Pain Points Section */}
        <section id="problemas" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Seu estoque é um buraco negro de dinheiro?</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                Se você ainda usa papel ou planilhas, provavelmente está perdendo dinheiro sem perceber.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {painPoints.map((pain, index) => (
                <div key={index} className="bg-red-50/50 p-8 rounded-2xl border border-red-100">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 mb-6">
                    <pain.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{pain.title}</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {pain.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section id="solucao" className="py-24 bg-slate-900 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold mb-6 uppercase tracking-wide">
                  <Zap className="h-3 w-3" />
                  A solução definitiva
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
                  Retome o controle total da sua operação
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  O Almox Fácil foi desenhado para quem não tem tempo a perder. Simples, rápido e funciona no celular da sua equipe.
                </p>

                <div className="space-y-6">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400 flex-shrink-0 border border-slate-700">
                        <benefit.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{benefit.title}</h3>
                        <p className="text-slate-400">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl -z-10" />
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  {/* Mobile Interface Mockup */}
                  <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 aspect-[9/16] max-w-xs mx-auto relative">
                    <div className="absolute top-0 left-0 right-0 h-14 bg-slate-800 flex items-center justify-center border-b border-slate-700">
                      <span className="text-white font-bold">Nova Movimentação</span>
                    </div>
                    <div className="p-6 mt-14 space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">Produto</div>
                        <div className="h-10 bg-slate-800 rounded border border-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">Quantidade</div>
                        <div className="h-10 bg-slate-800 rounded border border-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">Responsável</div>
                        <div className="h-10 bg-slate-800 rounded border border-slate-700" />
                      </div>
                      <div className="pt-4">
                        <div className="h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                          Confirmar Saída
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Simples como deve ser</h2>
              <p className="text-slate-600">Comece a usar em menos de 5 minutos</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-slate-100 z-0" />
              {[
                { step: "1", title: "Cadastre", desc: "Importe seus produtos ou cadastre em segundos." },
                { step: "2", title: "Movimente", desc: "Registre entradas e saídas pelo celular." },
                { step: "3", title: "Controle", desc: "Veja relatórios e saiba onde está cada item." }
              ].map((item, i) => (
                <div key={i} className="text-center bg-white relative z-10 pt-4">
                  <div className="w-16 h-16 mx-auto bg-white border-4 border-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-6 shadow-sm">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section id="depoimentos" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Quem usa, recomenda</h2>
              <p className="text-slate-600">Junte-se a mais de 200 empresas que transformaram sua gestão</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex gap-1 mb-4 text-yellow-400">
                    {[...Array(5)].map((_, starI) => (
                      <Star key={starI} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-6 leading-relaxed italic">&quot;{t.content}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{t.name}</p>
                      <p className="text-sm text-slate-500">{t.role}, {t.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Preço justo, sem surpresas</h2>
            <p className="text-slate-600 mb-12">
              Tudo o que você precisa em um único plano.
            </p>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-12 relative overflow-hidden transform hover:scale-105 transition-transform duration-300">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                MAIS POPULAR
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold text-slate-900">R$ 39,90</span>
                <span className="text-slate-500">/mês</span>
              </div>

              <ul className="space-y-4 mb-10 text-left max-w-xs mx-auto">
                {[
                  "Estoque ilimitado",
                  "Usuários ilimitados",
                  "Gestão de ferramentas",
                  "Controle de EPIs",
                  "Suporte prioritário via WhatsApp"
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <div className="bg-green-100 p-1 rounded-full">
                      <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>

              <RainbowButton
                onClick={handleStart}
                className="w-full h-auto py-4 font-bold rounded-xl"
              >
                Começar teste grátis de 7 dias
              </RainbowButton>
              <p className="text-xs text-slate-500 mt-4">
                Cancele quando quiser. Sem fidelidade.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-slate-900 text-white text-center px-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10" />
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-3xl sm:text-5xl font-bold mb-8">
              Pronto para organizar sua empresa?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Não deixe para depois. O controle que você precisa está a um clique de distância.
            </p>
            <button
              onClick={handleStart}
              className="px-10 py-5 rounded-full bg-white text-blue-600 font-bold text-lg hover:bg-blue-50 transition-colors shadow-2xl hover:shadow-white/20"
            >
              Criar conta grátis agora
            </button>
            <p className="mt-6 text-blue-200 text-sm">
              Junte-se a mais de 200 empresas inteligentes
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 rounded-md overflow-hidden">
              <Image
                src="/images/logo.png"
                alt="Logo Almox Fácil"
                fill
                className="object-cover grayscale opacity-50"
              />
            </div>
            <span className="font-bold text-slate-700">Almox Fácil</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-blue-600">Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privacidade</Link>
            <a href="mailto:contato@almoxfacil.com.br" className="hover:text-blue-600">Contato</a>
          </div>
          <div className="flex gap-4 text-slate-400">
            <a href="#" className="hover:text-blue-600"><InstagramIcon className="h-5 w-5" /></a>
            <a href="#" className="hover:text-blue-600"><YouTubeIcon className="h-5 w-5" /></a>
            <a href="#" className="hover:text-blue-600"><LinkedInIcon className="h-5 w-5" /></a>
          </div>
        </div>
      </footer>
    </div>
  )
}
