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

  const aiFeatures = [
    {
      icon: Camera,
      title: t('landing.ai_features.ocr_title'),
      description: t('landing.ai_features.ocr_desc')
    },
    {
      icon: Search,
      title: t('landing.ai_features.search_title'),
      description: t('landing.ai_features.search_desc')
    },
    {
      icon: Wand2,
      title: t('landing.ai_features.autofill_title'),
      description: t('landing.ai_features.autofill_desc')
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* Operium Icon - Geometric brackets */}
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" className="flex-shrink-0">
              <rect x="10" y="10" width="15" height="40" fill="currentColor" />
              <rect x="10" y="10" width="40" height="15" fill="currentColor" />
              <rect x="50" y="75" width="40" height="15" fill="currentColor" />
              <rect x="75" y="50" width="15" height="40" fill="currentColor" />
            </svg>
            <span className="font-bold text-xl tracking-wide text-slate-900">Operium</span>
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
            className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-100 p-4 shadow-xl z-50 h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="flex flex-col gap-6">
              <a href="#problemas" onClick={() => setMobileMenuOpen(false)} className="text-slate-700 text-base font-medium py-2 border-b border-slate-50">{t('landing.nav.problems')}</a>
              <a href="#solucao" onClick={() => setMobileMenuOpen(false)} className="text-slate-700 text-base font-medium py-2 border-b border-slate-50">{t('landing.nav.solution')}</a>
              <a href="#depoimentos" onClick={() => setMobileMenuOpen(false)} className="text-slate-700 text-base font-medium py-2 border-b border-slate-50">{t('landing.nav.testimonials')}</a>
              <hr className="border-slate-100 my-2" />
              <div className="flex justify-between items-center py-2">
                <Link href="/login" className="text-slate-700 text-base font-medium">{t('landing.nav.login')}</Link>
                <LanguageSwitcher />
              </div>
              <button
                onClick={handleStart}
                className="w-full bg-[#1C1C1C] active:bg-[#37352f] text-white py-3.5 rounded-xl text-base font-bold transition-transform active:scale-[0.98] shadow-lg mt-4"
              >
                {t('landing.nav.start_free')}
              </button>
            </div>
          </motion.div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-20 sm:pt-32 pb-8 sm:pb-20 bg-[#FFFEFC] overflow-hidden">
          <div className="flex flex-col text-center max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Free Forever + Mobile App Chips - Above title */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-6">
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] sm:text-xs font-bold shadow-sm">
                  <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 bg-[#1C1C1C] rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                  </div>
                  <span>{t('landing.hero.chip_free')}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] sm:text-xs font-bold shadow-sm">
                  <Smartphone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{t('landing.hero.chip_mobile')}</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#37352f] mb-4 sm:mb-6 leading-[1.15] sm:leading-[1.15] font-serif px-0 sm:px-0">
                {t('landing.hero.title_part1')} <span className="underline decoration-4 decoration-yellow-200 decoration-skip-ink-none">{t('landing.hero.title_part2')}</span>
              </h1>

              <p className="text-sm sm:text-lg md:text-xl text-[#37352f]/80 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
                {t('landing.hero.description')}
              </p>

              {/* Asset types highlights */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs sm:text-xs font-bold border border-slate-200">
                  <Box className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span>Ferramentas</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs sm:text-xs font-bold border border-slate-200">
                  <Zap className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span>Máquinas</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs sm:text-xs font-bold border border-slate-200">
                  <Shield className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span>EPIs</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 text-xs sm:text-xs font-bold border border-slate-200">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  <span>Veículos</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-3 sm:gap-3 mb-10 sm:mb-12 w-full px-4 sm:px-0">
                <button
                  onClick={handleStart}
                  disabled={checkoutLoading}
                  className="w-full sm:w-auto bg-[#1C1C1C] hover:bg-[#37352f] active:scale-[0.98] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {checkoutLoading ? <Loader2 className="animate-spin h-5 w-5 sm:h-5 sm:w-5" /> : (
                    <>
                      {t('landing.hero.cta_button')}
                      <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-black tracking-wide">GRÁTIS</span>
                    </>
                  )}
                  {!checkoutLoading && <ArrowRight className="h-4 w-4 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" />}
                </button>
                <p className="text-xs sm:text-xs text-slate-500 font-medium">
                  {t('landing.hero.cta_subtext')}
                </p>
              </div>

              <div className="w-full text-center mb-10 sm:mb-10">
                <p className="text-sm sm:text-sm text-slate-500/80 font-medium px-4 sm:px-0">
                  {t('landing.hero.no_card')}
                </p>
              </div>

              <div className="hidden sm:flex flex-col items-center justify-center gap-1.5 sm:gap-4 mb-4 sm:mb-12">
                <p className="text-[9px] sm:text-xs font-medium text-slate-400 uppercase tracking-widest">{t('landing.hero.partners')}</p>
                <div className="flex flex-row items-center justify-center w-full grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500 scale-75 sm:scale-100">
                  <AnimatedTooltip items={partners} />
                </div>
              </div>
            </motion.div>

            {/* Mockup Container - Simplified */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-lg sm:rounded-xl border border-slate-200 shadow-xl sm:shadow-2xl bg-white p-1 sm:p-4 mt-4 sm:mt-8 -mx-2 sm:mx-0"
            >
              <HeroAnimation />
            </motion.div>

          </div>
        </section>

        {/* Pain Points Section - Minimalist Grid */}
        <section id="problemas" className="py-6 sm:py-24 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="text-left mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#37352f] mb-4 sm:mb-4 font-serif leading-tight">{t('landing.pain_points.title')}</h2>
              <p className="text-[#37352f]/70 max-w-2xl text-sm sm:text-lg">
                {t('landing.pain_points.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
              {painPoints.map((pain, index) => (
                <div key={index} className="p-5 sm:p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all bg-white group shadow-sm">
                  <div className="w-10 h-10 sm:w-10 sm:h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                    <pain.icon className="h-5 w-5 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="text-lg sm:text-lg font-bold text-[#37352f] mb-2 sm:mb-2">{pain.title}</h3>
                  <p className="text-[#37352f]/70 leading-relaxed text-sm sm:text-sm hidden sm:block">
                    {pain.description}
                  </p>
                  {/* Mobile Bullets - Increased Legibility */}
                  <div className="sm:hidden flex flex-col gap-1.5 mt-1">
                    {t(`landing.pain_points.${Object.keys(t('landing.pain_points', { returnObjects: true }))[index + 2]}_mobile`, { defaultValue: pain.description }).split('\n').map((line, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-red-400 mt-1">•</span>
                        <span className="text-[#37352f]/80 text-sm leading-snug">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solution Section - Light Mode */}
        <section id="solucao" className="py-6 sm:py-24 bg-[#F7F7F5]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 sm:gap-2 px-3 sm:px-3 py-1.5 sm:py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] sm:text-xs font-bold mb-4 sm:mb-6 uppercase tracking-wide">
                  <Zap className="h-3 w-3 sm:h-3 sm:w-3" />
                  {t('landing.solution.badge')}
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight text-[#37352f] font-serif">
                  {t('landing.solution.title')}
                </h2>
                <p className="text-[#37352f]/70 text-sm sm:text-lg mb-10 sm:mb-12 leading-relaxed">
                  {t('landing.solution.description')}
                </p>

                <div className="space-y-8 sm:space-y-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4 sm:gap-5 group">
                      <div className="w-12 h-12 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center text-slate-700 flex-shrink-0 border border-slate-200 shadow-sm group-hover:border-slate-400 transition-colors">
                        <benefit.icon className="h-5 w-5 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-lg font-bold text-[#37352f] mb-1.5 sm:mb-1">{benefit.title}</h3>
                        <p className="text-[#37352f]/70 text-sm sm:text-sm hidden sm:block">{benefit.description}</p>
                        {/* Mobile Bullets - Increased Size & Spacing */}
                        <div className="sm:hidden flex flex-col gap-2.5 mt-2">
                          {t(`landing.solution.${['mobile', 'lost', 'alerts'][index]}_mobile`, { defaultValue: benefit.description }).split('\n').map((line, i) => (
                            <div key={i} className="flex gap-2.5 items-start">
                              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-[#37352f]/80 text-sm leading-relaxed">{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile CTA 1 - After Solution */}
                <div className="mt-8 sm:hidden w-full flex justify-center">
                  <button
                    onClick={handleStart}
                    className="w-full bg-[#1C1C1C] active:scale-[0.98] text-white px-6 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3"
                  >
                    {t('landing.hero.cta_button')} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative hidden lg:block">
                {/* Simplified Mockup Container - Hidden on mobile */}
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

        {/* Field Team Mobile App Section */}
        <section className="py-12 sm:py-24 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
              {/* Phone Mockup - Left side */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative flex justify-center lg:justify-start order-2 lg:order-1"
              >
                {/* Phone Frame */}
                <div className="relative">
                  {/* Phone outer shell */}
                  <div className="relative bg-[#1C1C1C] rounded-[2.5rem] sm:rounded-[3rem] p-2 sm:p-3 shadow-2xl shadow-slate-900/20">
                    {/* Dynamic island / notch */}
                    <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 w-16 sm:w-24 h-5 sm:h-7 bg-[#1C1C1C] rounded-full z-10" />

                    {/* Screen */}
                    <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden w-56 sm:w-72 aspect-[9/19]">
                      {/* Status bar */}
                      <div className="h-8 sm:h-10 bg-slate-50 flex items-center justify-between px-4 sm:px-6 pt-2">
                        <span className="text-[10px] sm:text-xs font-medium text-slate-600">9:41</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                          </div>
                          <div className="w-4 h-2 sm:w-6 sm:h-3 bg-slate-400 rounded-sm" />
                        </div>
                      </div>

                      {/* App header */}
                      <div className="bg-[#1C1C1C] px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2">
                          <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5">
                            <rect x="10" y="10" width="15" height="40" fill="white" />
                            <rect x="10" y="10" width="40" height="15" fill="white" />
                            <rect x="50" y="75" width="40" height="15" fill="white" />
                            <rect x="75" y="50" width="15" height="40" fill="white" />
                          </svg>
                          <span className="text-white font-bold text-xs sm:text-sm">Operium</span>
                        </div>
                      </div>

                      {/* App content */}
                      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 bg-[#1C1C1C] rounded-lg flex items-center justify-center">
                              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-white rotate-180" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium text-slate-700">Entrada</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 bg-slate-600 rounded-lg flex items-center justify-center">
                              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium text-slate-700">Saída</span>
                          </div>
                        </div>

                        {/* QR Scanner button */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1C1C1C] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-700">Escanear QR Code</div>
                            <div className="text-[10px] sm:text-xs text-slate-500">Registro rápido</div>
                          </div>
                        </div>

                        {/* Recent items */}
                        <div>
                          <div className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1.5 sm:mb-2">Últimas movimentações</div>
                          <div className="space-y-1.5 sm:space-y-2">
                            {[
                              { name: "Furadeira Bosch", type: "Saída", time: "10 min" },
                              { name: "EPI - Capacete", type: "Entrada", time: "1h" },
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg p-1.5 sm:p-2">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-100 rounded flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] sm:text-xs font-medium text-slate-700 truncate">{item.name}</div>
                                  <div className="text-[8px] sm:text-[10px] text-slate-400">{item.time}</div>
                                </div>
                                <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.type === 'Saída' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {item.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -z-10 top-10 -left-4 w-24 sm:w-32 h-24 sm:h-32 bg-slate-200 rounded-full blur-3xl opacity-50" />
                  <div className="absolute -z-10 bottom-10 -right-4 w-20 sm:w-28 h-20 sm:h-28 bg-slate-200 rounded-full blur-3xl opacity-50" />
                </div>
              </motion.div>

              {/* Content - Right side */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="order-1 lg:order-2"
              >
                <div className="inline-flex items-center gap-2 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] sm:text-xs font-bold mb-3 sm:mb-6 uppercase tracking-wide">
                  <Smartphone className="h-3 w-3 sm:h-3 sm:w-3" />
                  {t('landing.field_app.badge')}
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight text-[#37352f] font-serif">
                  {t('landing.field_app.title')}
                </h2>
                <p className="text-[#37352f]/70 text-sm sm:text-lg mb-10 sm:mb-12 leading-relaxed">
                  {t('landing.field_app.description')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
                  {[
                    { icon: Camera, title: t('landing.field_app.qr_scan'), desc: t('landing.field_app.qr_scan_desc') },
                    { icon: Zap, title: t('landing.field_app.offline'), desc: t('landing.field_app.offline_desc') },
                    { icon: Search, title: t('landing.field_app.photo'), desc: t('landing.field_app.photo_desc') },
                    { icon: TrendingUp, title: t('landing.field_app.instant'), desc: t('landing.field_app.instant_desc') },
                  ].map((feature, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-4 hover:shadow-sm transition-all flex sm:block items-center gap-4 sm:gap-0">
                      <div className="w-10 h-10 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center text-slate-700 mb-0 sm:mb-3 border border-slate-200 flex-shrink-0">
                        <feature.icon className="h-5 w-5 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-base font-bold text-[#37352f] mb-0.5 sm:mb-1">{feature.title}</h3>
                        <p className="text-[#37352f]/60 text-xs sm:text-sm block sm:block">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Loss Prevention Section */}
        <section className="py-8 sm:py-24 bg-[#F7F7F5] relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center gap-2 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] sm:text-xs font-bold mb-4 sm:mb-6 uppercase tracking-wide">
                <Shield className="h-3 w-3 sm:h-3 sm:w-3" />
                {t('landing.loss_prevention.badge')}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-[#37352f] font-serif leading-tight">
                {t('landing.loss_prevention.title')}
              </h2>
              <p className="text-[#37352f]/70 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
                {t('landing.loss_prevention.subtitle')}
              </p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-3 gap-2 sm:gap-8 mb-6 sm:mb-16"
            >
              {[
                { value: t('landing.loss_prevention.stat1_value'), label: t('landing.loss_prevention.stat1_label'), color: "text-[#37352f]" },
                { value: t('landing.loss_prevention.stat2_value'), label: t('landing.loss_prevention.stat2_label'), color: "text-[#37352f]" },
                { value: t('landing.loss_prevention.stat3_value'), label: t('landing.loss_prevention.stat3_label'), color: "text-[#37352f]" },
              ].map((stat, idx) => (
                <div key={idx} className="text-center p-3 sm:p-6 bg-white rounded-lg sm:rounded-xl border border-slate-200">
                  <div className={`text-xl sm:text-4xl md:text-5xl font-bold ${stat.color} mb-1 sm:mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-sm text-[#37352f]/60 font-medium leading-tight">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
              {[
                { icon: Users, title: t('landing.loss_prevention.feature1_title'), desc: t('landing.loss_prevention.feature1_desc') },
                { icon: Clock, title: t('landing.loss_prevention.feature2_title'), desc: t('landing.loss_prevention.feature2_desc') },
                { icon: BarChart3, title: t('landing.loss_prevention.feature3_title'), desc: t('landing.loss_prevention.feature3_desc') },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-xl border border-slate-200 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-700 mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-lg sm:text-lg font-bold text-[#37352f] mb-2 sm:mb-2">{feature.title}</h3>
                  <p className="text-[#37352f]/60 text-sm sm:text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Powered By Section */}
        <div className="py-8 sm:py-12 border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 sm:mb-8 uppercase tracking-wider">
              Powered by world-class technology
            </p>
            <LogoCloud logos={logos} />
          </div>
        </div>

        {/* AI Features Section - Clean Light Style */}
        <section className="py-6 sm:py-24 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center gap-2 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] sm:text-xs font-bold mb-4 sm:mb-6 uppercase tracking-wide">
                <Sparkles className="h-3 sm:h-3 sm:w-3" />
                {t('landing.ai_features.badge')}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight text-[#37352f] font-serif">
                {t('landing.ai_features.title')}
              </h2>
              <p className="text-[#37352f]/70 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
                {t('landing.ai_features.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {aiFeatures.map((feature, index) => (
                <div key={index} className="flex flex-col items-center text-center p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group">
                  <div className="w-12 h-12 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center text-slate-700 mb-4 sm:mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-lg sm:text-lg font-bold text-[#37352f] mb-2 sm:mb-2">{feature.title}</h3>
                  <p className="text-[#37352f]/70 text-sm sm:text-sm hidden sm:block">
                    {feature.description}
                  </p>
                  {/* Mobile Bullets - Better Mobile Text */}
                  <div className="sm:hidden flex flex-col gap-1.5 mt-2">
                    {t(`landing.ai_features.${['ocr', 'search', 'autofill'][index]}_mobile`, { defaultValue: feature.description }).split('\n').map((line, i) => (
                      <span key={i} className="text-[#37352f]/80 text-sm leading-snug block text-center">{line}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile CTA 2 - Before Testimonials (After AI) */}
            <div className="mt-8 sm:hidden w-full flex justify-center">
              <button
                onClick={handleStart}
                className="w-full bg-[#1C1C1C] active:scale-[0.98] text-white px-6 py-3.5 rounded-xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3"
              >
                {t('landing.hero.cta_button')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Features List Section */}
        <section className="py-12 sm:py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-6 sm:space-y-12 relative">
              {/* Connecting Line */}
              <div className="absolute left-[19px] sm:left-[27px] top-8 bottom-8 w-0.5 bg-slate-200 hidden md:block" />

              <div className="relative flex gap-4 sm:gap-8 items-start">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#1C1C1C] flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-slate-900/20">
                  <Headphones className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">{t('landing.features.support_title')}</h3>
                  <p className="text-slate-600 text-sm sm:text-lg">
                    {t('landing.features.support_desc')}
                  </p>
                </div>
              </div>

              <div className="relative flex gap-4 sm:gap-8 items-start">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#1C1C1C] flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-slate-900/20">
                  <Smartphone className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">{t('landing.features.online_title')}</h3>
                  <p className="text-slate-600 text-sm sm:text-lg">
                    {t('landing.features.online_desc')}
                  </p>
                </div>
              </div>

              <div className="relative flex gap-4 sm:gap-8 items-start">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-[#1C1C1C] flex items-center justify-center flex-shrink-0 z-10 shadow-lg shadow-slate-900/20">
                  <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">{t('landing.features.price_title')}</h3>
                  <p className="text-slate-600 text-sm sm:text-lg">
                    {t('landing.features.price_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section >

        {/* How it Works */}
        < section className="py-12 sm:py-24 bg-white" >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-4">{t('landing.how_it_works.title')}</h2>
              <p className="text-slate-600 text-sm sm:text-base">{t('landing.how_it_works.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12 relative">
              <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-slate-100 z-0" />
              {[
                { step: "1", title: t('landing.how_it_works.step1_title'), desc: t('landing.how_it_works.step1_desc') },
                { step: "2", title: t('landing.how_it_works.step2_title'), desc: t('landing.how_it_works.step2_desc') },
                { step: "3", title: t('landing.how_it_works.step3_title'), desc: t('landing.how_it_works.step3_desc') }
              ].map((item, i) => (
                <div key={i} className="text-center bg-white relative z-10 pt-4 sm:pt-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-white border-4 border-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mb-3 sm:mb-6 shadow-sm">
                    {item.step}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm sm:text-base">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section >

        {/* Social Proof */}
        < div id="depoimentos" >
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
        </div >


        {/* Final CTA - Minimalist */}
        < section className="py-12 sm:py-24 bg-[#F7F7F5] text-center px-4 relative overflow-hidden" >
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-6 text-[#37352f] font-serif leading-tight">
              {t('landing.cta_final.title')}
            </h2>
            <p className="text-sm sm:text-xl text-[#37352f]/70 mb-6 sm:mb-10 max-w-2xl mx-auto px-2 sm:px-0">
              {t('landing.cta_final.subtitle')}
            </p>
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-5 rounded-xl bg-[#1C1C1C] text-white font-bold text-base sm:text-lg hover:bg-[#37352f] transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]"
            >
              {t('landing.cta_final.button')}
            </button>
            <p className="mt-6 sm:mt-6 text-slate-500 text-sm sm:text-sm">
              {t('landing.cta_final.join')}
            </p>
          </div>
        </section >
      </main >

      {/* Footer */}
      < footer className="bg-slate-50 py-8 sm:py-12 border-t border-slate-200" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-4 sm:gap-8">
          <div className="flex items-center gap-2">
            {/* Operium Icon - Geometric brackets */}
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="flex-shrink-0 text-slate-400 sm:w-6 sm:h-6">
              <rect x="10" y="10" width="15" height="40" fill="currentColor" />
              <rect x="10" y="10" width="40" height="15" fill="currentColor" />
              <rect x="50" y="75" width="40" height="15" fill="currentColor" />
              <rect x="75" y="50" width="15" height="40" fill="currentColor" />
            </svg>
            <span className="font-bold text-slate-700 text-sm sm:text-base">Operium</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500">
            <Link href="/terms" className="hover:text-blue-600">{t('landing.footer.terms')}</Link>
            <Link href="/privacy" className="hover:text-blue-600">{t('landing.footer.privacy')}</Link>
            <a href="mailto:operiumtechnologies@gmail.com" className="hover:text-blue-600">{t('landing.footer.contact')}</a>
          </div>

          <div className="flex gap-4 text-slate-400">
            <a href="https://www.instagram.com/operium.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600"><InstagramIcon className="h-4 w-4 sm:h-5 sm:w-5" /></a>
            <a href="https://www.youtube.com/@operiumerp" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600"><YouTubeIcon className="h-4 w-4 sm:h-5 sm:w-5" /></a>
            <a href="https://www.linkedin.com/company/operiumerp" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600"><LinkedInIcon className="h-4 w-4 sm:h-5 sm:w-5" /></a>
          </div>

          <div className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">
            © {new Date().getFullYear()} Operium - Todos os direitos reservados
          </div>
        </div>
      </footer >

    </div >
  )
}
