"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Package, 
  BarChart3, 
  Users, 
  Wrench, 
  ArrowRight, 
  Check, 
  Zap, 
  Shield, 
  Clock,
  ChevronDown,
  Mail,
  Linkedin,
  Globe,
  Menu,
  X,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface LandingPageProps {
  isLoggedIn: boolean
  hasSubscription: boolean
  userEmail?: string
}

export default function LandingPage({ isLoggedIn, hasSubscription, userEmail }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    setError("")

    try {
      // Se não está logado, redirecionar para signup primeiro
      if (!isLoggedIn) {
        router.push("/signup?redirect=checkout")
        return
      }

      // Usuário logado - iniciar checkout
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login?redirect=checkout")
          return
        }
        throw new Error(data.error || "Erro ao iniciar checkout")
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("URL de checkout não retornada")
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar checkout")
      setCheckoutLoading(false)
    }
  }

  const features = [
    {
      icon: Package,
      title: "Gestão de Estoque",
      description: "Controle completo do seu almoxarifado com rastreamento em tempo real"
    },
    {
      icon: Users,
      title: "Colaboradores",
      description: "Gerencie sua equipe e acompanhe movimentações por responsável"
    },
    {
      icon: Wrench,
      title: "Ferramentas & Consertos",
      description: "Cadastre ferramentas e acompanhe consertos e manutenções"
    },
    {
      icon: BarChart3,
      title: "Relatórios & KPIs",
      description: "Dashboards industriais com métricas que importam"
    }
  ]

  const benefits = [
    { icon: Zap, text: "Implementação rápida" },
    { icon: Shield, text: "Dados seguros na nuvem" },
    { icon: Clock, text: "Suporte prioritário" }
  ]

  const pricingFeatures = [
    "Estoque ilimitado",
    "Colaboradores ilimitados",
    "Ferramentas ilimitadas",
    "Relatórios avançados",
    "Dashboard industrial",
    "Movimentações completas",
    "Gestão de consertos",
    "Suporte por email"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 antialiased">
      {/* Background Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(0 0 0)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      />

      {/* Gradient Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">Almox Fácil</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                Recursos
              </a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                Preços
              </a>
              <a href="#faq" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
                FAQ
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{userEmail}</span>
                  <Link 
                    href="/dashboard"
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                  >
                    Dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <Link 
                    href="/login"
                    className="px-4 py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-100 transition-colors"
                  >
                    Entrar
                  </Link>
                  <Link 
                    href="/signup"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
                  >
                    Começar grátis
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden py-4 border-t border-slate-200"
            >
              <div className="flex flex-col gap-4">
                <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium">Recursos</a>
                <a href="#pricing" className="text-slate-600 hover:text-slate-900 font-medium">Preços</a>
                <a href="#faq" className="text-slate-600 hover:text-slate-900 font-medium">FAQ</a>
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-slate-100 text-center font-medium">
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" className="px-4 py-2 rounded-lg bg-slate-100 text-center font-medium">
                        Entrar
                      </Link>
                      <Link href="/signup" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-center font-medium">
                        Começar grátis
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              7 dias grátis para testar
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Gestão de Almoxarifado
              <span className="block mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Simples e Poderosa
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Controle seu estoque, ferramentas, colaboradores e movimentações em uma plataforma completa. 
              Feito para indústrias que querem resultados.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Começar teste grátis
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <a 
                href="#features"
                className="w-full sm:w-auto px-8 py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
              >
                Ver recursos
                <ChevronDown className="h-5 w-5" />
              </a>
            </div>

            {error && (
              <p className="mt-4 text-red-600 text-sm">{error}</p>
            )}

            {/* Benefits */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-slate-600">
                  <benefit.icon className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200 bg-gradient-to-b from-slate-800 to-slate-900">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-slate-700 text-slate-400 text-sm">
                    app.almoxfacil.com.br
                  </div>
                </div>
              </div>
              {/* Dashboard Mock */}
              <div className="p-3 sm:p-6 bg-slate-50">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  {[
                    { label: "Itens em Estoque", value: "1.284" },
                    { label: "Colaboradores", value: "45" },
                    { label: "Ferramentas", value: "328" },
                    { label: "Movimentações/mês", value: "892" }
                  ].map((stat, i) => (
                    <div key={i} className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-white shadow-sm border border-slate-200">
                      <p className="text-xs sm:text-sm text-slate-500 truncate">{stat.label}</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2 h-36 sm:h-48 rounded-lg sm:rounded-xl bg-white shadow-sm border border-slate-200 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <p className="font-semibold text-slate-700 text-sm sm:text-base">Movimentações</p>
                      <div className="flex gap-1.5 sm:gap-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500" />
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-indigo-500" />
                      </div>
                    </div>
                    <div className="h-20 sm:h-28 flex items-end gap-1 sm:gap-2">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 82].map((h, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-sm"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="h-36 sm:h-48 rounded-lg sm:rounded-xl bg-white shadow-sm border border-slate-200 p-3 sm:p-4">
                    <p className="font-semibold text-slate-700 mb-3 sm:mb-4 text-sm sm:text-base">Status</p>
                    <div className="space-y-2 sm:space-y-3">
                      {[
                        { label: "Disponível", pct: 72, color: "bg-green-500" },
                        { label: "Em uso", pct: 20, color: "bg-blue-500" },
                        { label: "Manutenção", pct: 8, color: "bg-yellow-500" }
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs sm:text-sm mb-1">
                            <span className="text-slate-600">{item.label}</span>
                            <span className="text-slate-900 font-medium">{item.pct}%</span>
                          </div>
                          <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Uma plataforma completa para gerenciar seu almoxarifado industrial
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Platform Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-100 to-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium mb-4">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Multi-plataforma
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Acesse de qualquer lugar
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto px-4 sm:px-0">
              Desktop, tablet ou celular — seu almoxarifado na palma da mão. 
              Interface responsiva que se adapta perfeitamente a qualquer dispositivo.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative px-4 sm:px-0"
          >
            {/* Glow effect behind image */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-purple-400/20 blur-3xl rounded-full transform scale-75" />
            
            <img 
              src="/images/mockup-devices.png" 
              alt="Almox Fácil em múltiplos dispositivos - Desktop, Tablet e Mobile" 
              className="relative w-full max-w-4xl mx-auto drop-shadow-2xl"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-8 mt-8 sm:mt-12"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 bg-white rounded-xl shadow-lg border border-slate-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-slate-900 text-sm sm:text-base">Desktop</p>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Tela completa</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 bg-white rounded-xl shadow-lg border border-slate-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-slate-900 text-sm sm:text-base">Tablet</p>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Touch otimizado</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 bg-white rounded-xl shadow-lg border border-slate-200">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-slate-900 text-sm sm:text-base">Mobile</p>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Sempre disponível</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-blue-500 rounded-full blur-[128px]" />
        </div>

        <div className="max-w-4xl mx-auto relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              Preço simples, sem surpresas
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              Comece com 7 dias grátis. Cancele quando quiser.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-b from-slate-800 to-slate-800/50 rounded-2xl sm:rounded-3xl border border-slate-700 p-5 sm:p-8 lg:p-12"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Plano Profissional
                </div>
                <div className="flex items-baseline justify-center lg:justify-start gap-2 sm:gap-3">
                  <span className="text-lg sm:text-2xl text-slate-500 line-through">R$69,90</span>
                  <span className="text-3xl sm:text-5xl font-bold text-white">R$39,90</span>
                  <span className="text-slate-400 text-sm sm:text-base">/mês</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-2 mt-2">
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                    43% OFF
                  </span>
                  <p className="text-slate-400 text-xs sm:text-sm">Por empresa • Inclui tudo</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {pricingFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-400" />
                    </div>
                    <span className="text-slate-300 text-xs sm:text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-700">
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Começar 7 dias grátis
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
              <p className="text-center text-sm text-slate-500 mt-4">
                Sem cartão de crédito para começar o trial
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Perguntas frequentes
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                q: "Quanto tempo dura o período de teste?",
                a: "Você tem 7 dias grátis para testar todas as funcionalidades da plataforma. Após esse período, a assinatura será ativada automaticamente."
              },
              {
                q: "Posso cancelar a qualquer momento?",
                a: "Sim! Não há fidelidade. Você pode cancelar sua assinatura quando quiser, sem multas ou taxas adicionais."
              },
              {
                q: "Como funciona o suporte?",
                a: "Oferecemos suporte por email para todos os clientes. Respondemos em até 24 horas úteis."
              },
              {
                q: "Meus dados estão seguros?",
                a: "Sim. Usamos infraestrutura de ponta com criptografia de dados em repouso e em trânsito. Seus dados são isolados e backups são feitos automaticamente."
              },
              {
                q: "Quantos usuários posso ter?",
                a: "O plano inclui colaboradores ilimitados. Você pode cadastrar toda sua equipe sem custo adicional."
              }
            ].map((faq, index) => (
              <motion.details
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold text-lg">{faq.q}</span>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">{faq.a}</p>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='white'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
            }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Pronto para transformar sua gestão de almoxarifado?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Comece hoje mesmo com 7 dias grátis. Sem compromisso.
            </p>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="px-8 py-4 rounded-xl bg-white text-blue-600 font-semibold text-lg hover:bg-blue-50 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Começar teste grátis
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">Almox Fácil</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} Almox Fácil. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                <span>Dados protegidos conforme a <strong className="text-slate-500">LGPD</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <a 
                href="mailto:suporte@alnog.com.br"
                className="text-slate-500 hover:text-blue-600 transition-colors"
                title="Suporte por email"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a 
                href="https://www.linkedin.com/company/almoxfacil" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-blue-600 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://www.almoxfacil.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-blue-600 transition-colors"
                title="Website"
              >
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

