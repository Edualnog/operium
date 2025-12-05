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
  Headphones,
  Smartphone,
  CreditCard,
  BarChart3,
  Crown,
  Sparkles,
  Camera,
  Search,
  Wand2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import mockupDevices from "@/public/images/mockup-devices.png"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

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
  const { t } = useTranslation('common')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [plan, setPlan] = useState<"mensal" | "trimestral" | "anual">("trimestral")
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
      title: t('landing.pain_points.tools_title'),
      description: t('landing.pain_points.tools_desc')
    },
    {
      icon: Clock,
      title: t('landing.pain_points.spreadsheets_title'),
      description: t('landing.pain_points.spreadsheets_desc')
    },
    {
      icon: TrendingUp,
      title: t('landing.pain_points.emergency_title'),
      description: t('landing.pain_points.emergency_desc')
    }
  ]

  const benefits = [
    {
      icon: Smartphone,
      title: t('landing.solution.mobile_title'),
      description: t('landing.solution.mobile_desc')
    },
    {
      icon: Shield,
      title: t('landing.solution.lost_title'),
      description: t('landing.solution.lost_desc')
    },
    {
      icon: Zap,
      title: t('landing.solution.alerts_title'),
      description: t('landing.solution.alerts_desc')
    }
  ]

  const testimonials = [
    {
      name: "Ricardo Silva",
      role: t('landing.testimonials.t1_role'),
      company: "Mecânica Silva",
      content: t('landing.testimonials.t1_content')
    },
    {
      name: "Ana Paula",
      role: t('landing.testimonials.t2_role'),
      company: "AP Construções",
      content: t('landing.testimonials.t2_content')
    },
    {
      name: "Carlos Eduardo",
      role: t('landing.testimonials.t3_role'),
      company: "Instalações Express",
      content: t('landing.testimonials.t3_content')
    }
  ]

  const partners = [
    {
      id: 1,
      name: "João Silva",
      designation: "CEO da TechFix",
      image: "/partners/joao.jpg",
    },
    {
      id: 2,
      name: "Maria Santos",
      designation: "Diretora da ConstruMax",
      image: "/partners/maria.jpg",
    },
    {
      id: 3,
      name: "Pedro Costa",
      designation: "Gerente da EletroFast",
      image: "/partners/pedro.jpg",
    },
    {
      id: 4,
      name: "Ana Oliveira",
      designation: "Sócia da Mecânica Sul",
      image: "/partners/ana.jpg",
    },
    {
      id: 5,
      name: "Carlos Souza",
      designation: "Dono da Refrigeração Z",
      image: "/partners/carlos.jpg",
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
                src="/images/logo-v2.png"
                alt="Logo Almox Fácil"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Almox Fácil</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#problemas" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('landing.nav.problems')}</a>
            <a href="#solucao" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('landing.nav.solution')}</a>
            <a href="#depoimentos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">{t('landing.nav.testimonials')}</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            {isLoggedIn ? (
              <Link href="/dashboard" className="text-sm font-medium text-slate-700 hover:text-blue-600">
                {t('landing.nav.dashboard')}
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-blue-600">
                {t('landing.nav.login')}
              </Link>
            )}
            <RainbowButton
              onClick={handleStart}
              className="px-5 py-2.5 h-auto text-sm font-semibold rounded-xl"
            >
              {t('landing.nav.start_free')}
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
              <a href="#problemas" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">{t('landing.nav.problems')}</a>
              <a href="#solucao" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">{t('landing.nav.solution')}</a>
              <a href="#depoimentos" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">{t('landing.nav.testimonials')}</a>
              <hr className="border-slate-100" />
              <div className="flex justify-between items-center">
                <Link href="/login" className="text-slate-600 font-medium">{t('landing.nav.login')}</Link>
                <LanguageSwitcher />
              </div>
              <RainbowButton
                onClick={handleStart}
                className="w-full h-auto py-3 font-semibold rounded-xl"
              >
                {t('landing.nav.start_free')}
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
                      {t('landing.hero.badge')}
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                      {t('landing.hero.title_part1')} <span className="text-blue-600">{t('landing.hero.title_part2')}</span> {t('landing.hero.title_part3')}
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                      {t('landing.hero.description')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                      <RainbowButton
                        onClick={handleStart}
                        disabled={checkoutLoading}
                        className="w-full sm:w-auto h-auto px-8 py-4 text-lg font-bold flex items-center justify-center gap-2 rounded-xl"
                      >
                        {checkoutLoading ? <Loader2 className="animate-spin" /> : t('landing.hero.cta_button')}
                        {!checkoutLoading && <ArrowRight className="h-5 w-5" />}
                      </RainbowButton>
                      <p className="text-sm text-slate-500 font-medium">
                        {t('landing.hero.no_card')}
                      </p>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4 mb-8">
                      <p className="text-sm text-slate-500 font-medium">{t('landing.hero.partners')}</p>
                      <div className="flex flex-row items-center justify-center w-full">
                        <AnimatedTooltip items={partners} />
                      </div>
                    </div>
                  </motion.div>
                </>
              }
            >
              <div className="w-full h-full relative">
                <div className="hidden lg:block w-full h-full relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
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
                          <div className="h-6 w-20 bg-blue-600 rounded text-[10px] text-white flex items-center justify-center font-bold">{t('landing.mockup.new_exit')}</div>
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
                      <p className="text-xs text-slate-400">{t('landing.mockup.stock_updated')}</p>
                      <p className="font-bold text-white">{t('landing.mockup.just_now')}</p>
                    </div>
                  </div>
                </div>

                {/* Mobile/Tablet: carrega mockup via next/image com lazy load */}
                <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 lg:hidden">
                  <Image
                    src={mockupDevices}
                    alt="Mockup do Almox Fácil em múltiplos dispositivos"
                    fill
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-cover"
                    placeholder="blur"
                    loading="lazy"
                    priority={false}
                  />
                </div>
              </div>
            </ContainerScroll>
          </div>
        </section>

        {/* Pain Points Section */}
        <section id="problemas" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('landing.pain_points.title')}</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">
                {t('landing.pain_points.subtitle')}
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
                  {t('landing.solution.badge')}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
                  {t('landing.solution.title')}
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  {t('landing.solution.description')}
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
                      <span className="text-white font-bold">{t('landing.mockup.new_movement')}</span>
                    </div>
                    <div className="p-6 mt-14 space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">{t('landing.mockup.product')}</div>
                        <div className="h-10 bg-slate-800 rounded border border-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">{t('landing.mockup.quantity')}</div>
                        <div className="h-10 bg-slate-800 rounded border border-slate-700" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">{t('landing.mockup.responsible')}</div>
                        <div className="h-10 bg-slate-800 rounded border border-slate-700" />
                      </div>
                      <div className="pt-4">
                        <div className="h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {t('landing.mockup.confirm_exit')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Features Section */}
        <section className="py-24 bg-slate-900 text-white overflow-hidden relative border-t border-slate-800">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold mb-6 uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                {t('landing.ai_features.badge')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('landing.ai_features.title')}</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                {t('landing.ai_features.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* OCR */}
              <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-purple-500/50 transition-colors group">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('landing.ai_features.ocr_title')}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {t('landing.ai_features.ocr_desc')}
                </p>
              </div>

              {/* Smart Search */}
              <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-colors group">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('landing.ai_features.search_title')}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {t('landing.ai_features.search_desc')}
                </p>
              </div>

              {/* Auto-fill */}
              <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 hover:border-green-500/50 transition-colors group">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-6 group-hover:scale-110 transition-transform">
                  <Wand2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{t('landing.ai_features.autofill_title')}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {t('landing.ai_features.autofill_desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features List Section */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-12 relative">
              {/* Connecting Line */}
              <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-slate-200 hidden md:block" />

              <div className="relative flex gap-8 items-start">
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-600/20">
                  <Headphones className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{t('landing.features.support_title')}</h3>
                  <p className="text-slate-600 text-lg">
                    {t('landing.features.support_desc')}
                  </p>
                </div>
              </div>

              <div className="relative flex gap-8 items-start">
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-600/20">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{t('landing.features.online_title')}</h3>
                  <p className="text-slate-600 text-lg">
                    {t('landing.features.online_desc')}
                  </p>
                </div>
              </div>

              <div className="relative flex gap-8 items-start">
                <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-blue-600/20">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{t('landing.features.price_title')}</h3>
                  <p className="text-slate-600 text-lg">
                    {t('landing.features.price_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('landing.how_it_works.title')}</h2>
              <p className="text-slate-600">{t('landing.how_it_works.subtitle')}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-slate-100 z-0" />
              {[
                { step: "1", title: t('landing.how_it_works.step1_title'), desc: t('landing.how_it_works.step1_desc') },
                { step: "2", title: t('landing.how_it_works.step2_title'), desc: t('landing.how_it_works.step2_desc') },
                { step: "3", title: t('landing.how_it_works.step3_title'), desc: t('landing.how_it_works.step3_desc') }
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
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('landing.testimonials.title')}</h2>
              <p className="text-slate-600">{t('landing.testimonials.subtitle')}</p>
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
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('landing.pricing.title')}</h2>
            <p className="text-slate-600 mb-12">
              {t('landing.pricing.subtitle')}
            </p>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* Monthly */}
              <div
                onClick={() => setPlan("mensal")}
                className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 bg-white hover:border-slate-300
                  ${plan === "mensal" ? "border-blue-500 scale-[1.02] shadow-xl shadow-blue-500/20" : "border-slate-200"}
                `}
              >
                <div className="text-center pt-2">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('landing.pricing.monthly')}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-slate-900">R$69,90</span>
                    <span className="text-slate-500 text-sm">/mês</span>
                  </div>
                  <div className="text-sm text-slate-500 mb-4">≈ R$69,90/mês</div>
                  <div className={`w-5 h-5 rounded-full border-2 mx-auto transition-all ${plan === "mensal" ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                    {plan === "mensal" && <Check className="h-4 w-4 text-white m-auto" style={{ marginTop: "1px" }} />}
                  </div>
                </div>
              </div>

              {/* Quarterly - Most Popular */}
              <div
                onClick={() => setPlan("trimestral")}
                className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 bg-white
                  ${plan === "trimestral" ? "border-blue-500 scale-[1.02] shadow-xl shadow-blue-500/20" : "border-slate-200 hover:border-slate-300"}
                  ring-2 ring-blue-500 ring-offset-2
                `}
              >
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-blue-500 text-white">
                  <Star className="h-3 w-3" />
                  {t('landing.pricing.most_popular')}
                </div>
                {/* Discount */}
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">-12%</div>
                <div className="text-center pt-2">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('landing.pricing.quarterly')}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-slate-900">R$189,90</span>
                    <span className="text-slate-500 text-sm">/trimestre</span>
                  </div>
                  <div className="text-sm text-slate-500 mb-4">≈ R$63,30/mês</div>
                  <div className={`w-5 h-5 rounded-full border-2 mx-auto transition-all ${plan === "trimestral" ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                    {plan === "trimestral" && <Check className="h-4 w-4 text-white m-auto" style={{ marginTop: "1px" }} />}
                  </div>
                </div>
              </div>

              {/* Annual - Best Value */}
              <div
                onClick={() => setPlan("anual")}
                className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 bg-white hover:border-slate-300
                  ${plan === "anual" ? "border-blue-500 scale-[1.02] shadow-xl shadow-blue-500/20" : "border-slate-200"}
                `}
              >
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                  <Crown className="h-3 w-3" />
                  {t('landing.pricing.best_value')}
                </div>
                {/* Discount */}
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">-32%</div>
                <div className="text-center pt-2">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('landing.pricing.annual')}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-slate-900">R$597,00</span>
                    <span className="text-slate-500 text-sm">/ano</span>
                  </div>
                  <div className="text-sm text-slate-500 mb-4">≈ R$49,75/mês</div>
                  <div className={`w-5 h-5 rounded-full border-2 mx-auto transition-all ${plan === "anual" ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                    {plan === "anual" && <Check className="h-4 w-4 text-white m-auto" style={{ marginTop: "1px" }} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Features and CTA */}
            <div className="bg-slate-50 rounded-2xl p-8 max-w-lg mx-auto">
              <ul className="space-y-4 mb-8 text-left">
                {[
                  t('landing.pricing.feat_stock'),
                  t('landing.pricing.feat_users'),
                  t('landing.pricing.feat_tools'),
                  t('landing.pricing.feat_epi'),
                  t('landing.pricing.feat_support')
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
                {t('landing.pricing.cta')}
              </RainbowButton>
              <p className="text-xs text-slate-500 mt-4">
                {t('landing.pricing.cancel_anytime')}
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-slate-900 text-white text-center px-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-10" />
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-3xl sm:text-5xl font-bold mb-8">
              {t('landing.cta_final.title')}
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              {t('landing.cta_final.subtitle')}
            </p>
            <button
              onClick={handleStart}
              className="px-10 py-5 rounded-full bg-white text-blue-600 font-bold text-lg hover:bg-blue-50 transition-colors shadow-2xl hover:shadow-white/20"
            >
              {t('landing.cta_final.button')}
            </button>
            <p className="mt-6 text-blue-200 text-sm">
              {t('landing.cta_final.join')}
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
                src="/images/logo-v2.png"
                alt="Logo Almox Fácil"
                fill
                className="object-cover grayscale opacity-50"
              />
            </div>
            <span className="font-bold text-slate-700">Almox Fácil</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-blue-600">{t('landing.footer.terms')}</Link>
            <Link href="/privacy" className="hover:text-blue-600">{t('landing.footer.privacy')}</Link>
            <a href="mailto:contato@almoxfacil.com.br" className="hover:text-blue-600">{t('landing.footer.contact')}</a>
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
