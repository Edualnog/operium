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
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { LogoCloud } from "@/components/ui/logo-cloud"
import { TestimonialsSection } from "@/components/landing/TestimonialsSection"
import { HeroAnimation } from "@/components/landing/HeroAnimation"


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
  const router = useRouter()

  const logos = [
    { src: "/images/logos/openai.svg", alt: "OpenAI" },
    { src: "/images/logos/gemini.png", alt: "Google Gemini" },
    { src: "/images/logos/anthropic.png", alt: "Anthropic" },
    { src: "/images/logos/vercel.png", alt: "Vercel" },
    { src: "/images/logos/supabase.svg", alt: "Supabase" },
    { src: "/images/logos/hostinger.svg", alt: "Hostinger" },
    { src: "/images/logos/react.svg", alt: "React" },
    { src: "/images/logos/tailwind.svg", alt: "Tailwind CSS" },
    { src: "/images/logos/nextjs.svg", alt: "Next.js" },
    { src: "/images/logos/figma.png", alt: "Figma" },
  ]

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
                alt="Logo Operium"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Operium</span>
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
            <button
              onClick={handleStart}
              className="bg-[#1C1C1C] hover:bg-[#37352f] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t('landing.nav.start_free')}
            </button>
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
              <button
                onClick={handleStart}
                className="w-full bg-[#1C1C1C] hover:bg-[#37352f] text-white py-3 rounded-md font-medium transition-colors"
              >
                {t('landing.nav.start_free')}
              </button>
            </div>
          </motion.div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 bg-[#FFFEFC] overflow-hidden">
          <div className="flex flex-col text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Badge Minimalista */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 text-slate-600 text-xs font-semibold mb-8 tracking-wide cursor-default">
                <Star className="h-3 w-3" />
                <span>Simples. Gratuito. Poderoso.</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#37352f] mb-6 leading-[1.1] font-serif">
                {t('landing.hero.title_part1')} <span className="underline decoration-4 decoration-yellow-200 decoration-skip-ink-none">{t('landing.hero.title_part2')}</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#37352f]/70 mb-10 max-w-2xl mx-auto leading-relaxed">
                {t('landing.hero.description')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <button
                  onClick={handleStart}
                  disabled={checkoutLoading}
                  className="bg-[#1C1C1C] hover:bg-[#37352f] text-white px-8 py-4 rounded-lg font-medium text-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {checkoutLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <>
                      {t('landing.hero.cta_button')}
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs ml-1">100% Grátis</span>
                    </>
                  )}
                  {!checkoutLoading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>

              <div className="w-full text-center -mt-12 mb-16">
                <p className="text-xs sm:text-sm text-slate-500/80 font-medium">
                  {t('landing.hero.no_card')}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 mb-12">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">{t('landing.hero.partners')}</p>
                <div className="flex flex-row items-center justify-center w-full grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                  <AnimatedTooltip items={partners} />
                </div>
              </div>
            </motion.div>

            {/* Mockup Container - Simplified */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-xl border border-slate-200 shadow-2xl bg-white p-2 sm:p-4 mt-8"
            >
              <HeroAnimation />
            </motion.div>

          </div>
        </section>

        {/* Pain Points Section - Minimalist Grid */}
        <section id="problemas" className="py-24 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-left mb-16">
              <h2 className="text-3xl font-bold text-[#37352f] mb-4 font-serif">{t('landing.pain_points.title')}</h2>
              <p className="text-[#37352f]/70 max-w-2xl text-lg">
                {t('landing.pain_points.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {painPoints.map((pain, index) => (
                <div key={index} className="p-6 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all bg-white group">
                  <div className="w-10 h-10 bg-red-50 rounded-md flex items-center justify-center text-red-600 mb-4 group-hover:scale-110 transition-transform">
                    <pain.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#37352f] mb-2">{pain.title}</h3>
                  <p className="text-[#37352f]/70 leading-relaxed text-sm">
                    {pain.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution Section - Light Mode */}
        <section id="solucao" className="py-24 bg-[#F7F7F5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold mb-6 uppercase tracking-wide">
                  <Zap className="h-3 w-3" />
                  {t('landing.solution.badge')}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight text-[#37352f] font-serif">
                  {t('landing.solution.title')}
                </h2>
                <p className="text-[#37352f]/70 text-lg mb-8 leading-relaxed">
                  {t('landing.solution.description')}
                </p>

                <div className="space-y-6">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4 group">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-700 flex-shrink-0 border border-slate-200 shadow-sm group-hover:border-blue-300 transition-colors">
                        <benefit.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#37352f] mb-1">{benefit.title}</h3>
                        <p className="text-[#37352f]/70 text-sm">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                {/* Simplified Mockup Container */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl shadow-slate-200/50 rotate-2 hover:rotate-0 transition-transform duration-500">
                  {/* Mobile Interface Mockup */}
                  <div className="bg-white rounded-xl overflow-hidden border border-slate-200 aspect-[9/16] max-w-xs mx-auto relative shadow-inner">
                    <div className="absolute top-0 left-0 right-0 h-14 bg-slate-50 flex items-center justify-center border-b border-slate-200">
                      <span className="text-slate-700 font-bold text-sm">{t('landing.mockup.new_movement')}</span>
                    </div>
                    <div className="p-6 mt-14 space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400 font-medium">{t('landing.mockup.product')}</div>
                        <div className="h-10 bg-slate-50 rounded border border-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400 font-medium">{t('landing.mockup.quantity')}</div>
                        <div className="h-10 bg-slate-50 rounded border border-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400 font-medium">{t('landing.mockup.responsible')}</div>
                        <div className="h-10 bg-slate-50 rounded border border-slate-200" />
                      </div>
                      <div className="pt-4">
                        <div className="h-10 bg-[#1C1C1C] rounded-md flex items-center justify-center text-white text-sm font-bold shadow-md">
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

        {/* Powered By Section */}
        <div className="py-12 border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 uppercase tracking-wider">
              Powered by world-class technology
            </p>
            <LogoCloud logos={logos} />
          </div>
        </div>

        {/* AI Features Section - Clean Light Style */}
        <section className="py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold mb-6 uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                {t('landing.ai_features.badge')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-[#37352f] font-serif">{t('landing.ai_features.title')}</h2>
              <p className="text-[#37352f]/70 max-w-2xl mx-auto text-lg">
                {t('landing.ai_features.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* OCR */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                  <Camera className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#37352f] mb-2">{t('landing.ai_features.ocr_title')}</h3>
                <p className="text-[#37352f]/70 text-sm leading-relaxed">
                  {t('landing.ai_features.ocr_desc')}
                </p>
              </div>

              {/* Smart Search */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#37352f] mb-2">{t('landing.ai_features.search_title')}</h3>
                <p className="text-[#37352f]/70 text-sm leading-relaxed">
                  {t('landing.ai_features.search_desc')}
                </p>
              </div>

              {/* Auto-fill */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                  <Wand2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#37352f] mb-2">{t('landing.ai_features.autofill_title')}</h3>
                <p className="text-[#37352f]/70 text-sm leading-relaxed">
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
        <div id="depoimentos">
          <TestimonialsSection
            title={t('landing.testimonials.title')}
            description={t('landing.testimonials.subtitle')}
            testimonials={testimonials.map((testimonial, idx) => ({
              author: {
                name: testimonial.name,
                handle: `${testimonial.role}, ${testimonial.company}`,
                avatar: [
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces", // Ricardo
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces", // Ana
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces"  // Carlos
                ][idx] || "",
              },
              text: testimonial.content,
              href: "#",
            }))}
          />
        </div>


        {/* Final CTA - Minimalist */}
        <section className="py-24 bg-[#F7F7F5] text-center px-4 relative overflow-hidden">
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-3xl sm:text-5xl font-bold mb-6 text-[#37352f] font-serif">
              {t('landing.cta_final.title')}
            </h2>
            <p className="text-xl text-[#37352f]/70 mb-10 max-w-2xl mx-auto">
              {t('landing.cta_final.subtitle')}
            </p>
            <button
              onClick={handleStart}
              className="px-10 py-5 rounded-lg bg-[#1C1C1C] text-white font-medium text-lg hover:bg-[#37352f] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              {t('landing.cta_final.button')}
            </button>
            <p className="mt-6 text-slate-500 text-sm">
              {t('landing.cta_final.join')}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 rounded-md overflow-hidden">
              <Image
                src="/images/logo-v2.png"
                alt="Logo Operium"
                fill
                className="object-cover grayscale opacity-50"
              />
            </div>
            <span className="font-bold text-slate-700">Operium</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-blue-600">{t('landing.footer.terms')}</Link>
            <Link href="/privacy" className="hover:text-blue-600">{t('landing.footer.privacy')}</Link>
            <a href="mailto:contato@almoxfacil.com.br" className="hover:text-blue-600">{t('landing.footer.contact')}</a>
          </div>

          <div className="flex gap-4 text-slate-400">
            <a href="#" className="hover:text-blue-600"><InstagramIcon className="h-5 w-5" /></a>
            <a href="#" className="hover:text-blue-600"><YouTubeIcon className="h-5 w-5" /></a>
            <a href="https://www.linkedin.com/company/almoxfacil" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600"><LinkedInIcon className="h-5 w-5" /></a>
          </div>

          <div className="text-xs text-slate-400 mt-2">
            © {new Date().getFullYear()} Operium - Todos os direitos reservados
          </div>
        </div>
      </footer>

    </div >
  )
}
