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
  Users
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

  const benefits = [
    {
      icon: TrendingUp,
      title: "Reduza erros e prejuízos",
      description: "Chega de perder dinheiro com estoque parado ou compras duplicadas. Tenha controle total do que entra e sai."
    },
    {
      icon: Clock,
      title: "Automatize tarefas chatas",
      description: "Deixe o sistema cuidar dos avisos de reposição e validade enquanto você foca em crescer seu negócio."
    },
    {
      icon: LayoutDashboard,
      title: "Clareza financeira",
      description: "Saiba exatamente quanto você tem investido em estoque e ferramentas em tempo real, sem planilhas confusas."
    }
  ]

  const testimonials = [
    {
      name: "Ricardo Silva",
      role: "Gerente de Operações",
      company: "Indústria Metalúrgica RS",
      content: "Antes era um caos saber onde estavam as ferramentas. Com o Almox Fácil, economizamos umas 10 horas por semana só de não ter que procurar coisas."
    },
    {
      name: "Ana Paula",
      role: "Proprietária",
      company: "AP Construções",
      content: "Simples e direto ao ponto. Instalei, cadastrei e comecei a usar. A equipe adorou porque é muito fácil de mexer no celular."
    },
    {
      name: "Carlos Eduardo",
      role: "Gestor de Estoque",
      company: "Logística Express",
      content: "O controle de EPIs salvou a gente de uma multa. O sistema avisa quando vai vencer, é sensacional."
    }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 shadow-md shadow-blue-500/20">
              <Box className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Almox Fácil</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#beneficios" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Benefícios</a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Como funciona</a>
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
            <button
              onClick={handleStart}
              className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Começar Grátis
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
              <a href="#beneficios" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">Benefícios</a>
              <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">Como funciona</a>
              <a href="#depoimentos" onClick={() => setMobileMenuOpen(false)} className="text-slate-600 font-medium">Depoimentos</a>
              <hr className="border-slate-100" />
              <Link href="/login" className="text-slate-600 font-medium">Entrar</Link>
              <button
                onClick={handleStart}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold"
              >
                Começar Grátis
              </button>
            </div>
          </motion.div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center relative">

            {/* Background Blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl -z-10" />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6 uppercase tracking-wide">
                <Zap className="h-3 w-3" />
                Mais de 200 empresas já organizaram a casa
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-[1.1]">
                Organize seu negócio de forma <span className="text-blue-600">simples</span> e <span className="text-indigo-600">inteligente</span>.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                Abandone as planilhas complexas e o caos do estoque. O Almox Fácil é o sistema feito para quem quer controle total sem dor de cabeça.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <button
                  onClick={handleStart}
                  disabled={checkoutLoading}
                  className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? <Loader2 className="animate-spin" /> : "Começar grátis agora"}
                  {!checkoutLoading && <ArrowRight className="h-5 w-5" />}
                </button>
                <p className="text-sm text-slate-500">
                  Teste grátis por 7 dias • Sem cartão de crédito
                </p>
              </div>
            </motion.div>

            {/* Dashboard Visual */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative mx-auto max-w-5xl"
            >
              <div className="rounded-2xl bg-slate-900 p-2 sm:p-3 shadow-2xl shadow-blue-900/20 ring-1 ring-slate-900/10">
                <div className="rounded-xl bg-slate-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                  </div>
                  {/* Abstract Dashboard UI Representation */}
                  <div className="p-6 bg-slate-50 min-h-[300px] sm:min-h-[500px] grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="hidden sm:block col-span-1 bg-white rounded-xl border border-slate-100 p-4 space-y-3">
                      <div className="h-8 w-3/4 bg-slate-100 rounded-lg mb-6" />
                      <div className="h-10 w-full bg-blue-50 rounded-lg border border-blue-100" />
                      <div className="h-10 w-full bg-white rounded-lg" />
                      <div className="h-10 w-full bg-white rounded-lg" />
                      <div className="h-10 w-full bg-white rounded-lg" />
                    </div>
                    {/* Main Content */}
                    <div className="col-span-1 sm:col-span-2 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <div className="h-4 w-1/2 bg-slate-100 rounded mb-2" />
                          <div className="h-8 w-3/4 bg-slate-800 rounded" />
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <div className="h-4 w-1/2 bg-slate-100 rounded mb-2" />
                          <div className="h-8 w-3/4 bg-blue-600 rounded" />
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-48 flex items-end justify-between gap-2">
                        {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                          <div key={i} className="w-full bg-blue-100 rounded-t-lg relative group">
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all duration-500"
                              style={{ height: `${h}%` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100" />
                          <div className="flex-1">
                            <div className="h-4 w-1/3 bg-slate-100 rounded mb-1" />
                            <div className="h-3 w-1/4 bg-slate-50 rounded" />
                          </div>
                          <div className="h-8 w-20 bg-green-100 rounded-full" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100" />
                          <div className="flex-1">
                            <div className="h-4 w-1/3 bg-slate-100 rounded mb-1" />
                            <div className="h-3 w-1/4 bg-slate-50 rounded" />
                          </div>
                          <div className="h-8 w-20 bg-green-100 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="beneficios" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Por que escolher o Almox Fácil?</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Desenvolvemos uma plataforma focada no que realmente importa: resultados e simplicidade para o seu dia a dia.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
                  <p className="text-slate-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="como-funciona" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Simples como deve ser</h2>
              <p className="text-slate-600">Comece a usar em menos de 5 minutos</p>
            </div>

            <div className="relative">
              {/* Connector Line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

              <div className="grid md:grid-cols-3 gap-12 relative z-10">
                {[
                  { step: "1", title: "Crie sua conta", desc: "Cadastro rápido, sem cartão de crédito." },
                  { step: "2", title: "Configure", desc: "Adicione sua empresa e primeiros itens." },
                  { step: "3", title: "Assuma o controle", desc: "Gerencie tudo pelo computador ou celular." }
                ].map((item, i) => (
                  <div key={i} className="text-center bg-white p-4">
                    <div className="w-16 h-16 mx-auto bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-slate-900/20">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section id="depoimentos" className="py-24 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Quem usa, recomenda</h2>
              <p className="text-slate-400">Junte-se a mais de 200 empresas que transformaram sua gestão</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-sm">
                  <div className="flex gap-1 mb-4 text-yellow-400">
                    {[...Array(5)].map((_, starI) => (
                      <Star key={starI} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6 leading-relaxed">&quot;{t.content}&quot;</p>
                  <div>
                    <p className="font-bold text-white">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.role}, {t.company}</p>
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

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                MAIS POPULAR
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold text-slate-900">R$ 97</span>
                <span className="text-slate-500">/mês</span>
              </div>

              <ul className="space-y-4 mb-10 text-left max-w-xs mx-auto">
                {[
                  "Estoque ilimitado",
                  "Usuários ilimitados",
                  "Gestão de ferramentas",
                  "Controle de EPIs",
                  "Suporte prioritário"
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleStart}
                className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
              >
                Começar teste grátis de 7 dias
              </button>
              <p className="text-xs text-slate-500 mt-4">
                Cancele quando quiser. Sem fidelidade.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-blue-600 text-white text-center px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-bold mb-8">
              Pronto para organizar sua empresa?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Não deixe para depois. O controle que você precisa está a um clique de distância.
            </p>
            <button
              onClick={handleStart}
              className="px-10 py-5 rounded-full bg-white text-blue-600 font-bold text-lg hover:bg-blue-50 transition-colors shadow-2xl"
            >
              Criar conta grátis agora
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-slate-400" />
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
