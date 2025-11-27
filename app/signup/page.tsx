"use client"

import * as React from "react"
import { Mail, ArrowLeft } from "lucide-react"
import { Turnstile } from "@marsidev/react-turnstile"

// Ícones SVG elegantes para redes sociais
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)
import { motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import Link from "next/link"

export default function SignupPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [companyName, setCompanyName] = React.useState("")
  const [cnpj, setCnpj] = React.useState("")
  const [companyEmail, setCompanyEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [info, setInfo] = React.useState("")
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const captchaRef = React.useRef<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  const redirectTo = searchParams.get("redirect")

  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Se veio do checkout, redirecionar para checkout
        if (redirectTo === "checkout") {
          handleCheckoutRedirect()
          return
        }
        
        // Verificar status da assinatura
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status, stripe_customer_id")
          .eq("id", session.user.id)
          .single()

        const activeStatuses = ["active", "trialing"]
        const hasActiveSubscription = profile?.subscription_status && activeStatuses.includes(profile.subscription_status)
        const hasStripeCustomer = !!profile?.stripe_customer_id
        
        if (hasActiveSubscription || hasStripeCustomer) {
          router.push("/dashboard")
        } else {
          router.push("/subscribe")
        }
      }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Se veio do checkout, iniciar checkout
        if (redirectTo === "checkout") {
          handleCheckoutRedirect()
          return
        }
        
        // Sempre redirecionar para subscribe após criar conta
        // (novo usuário nunca tem assinatura)
        window.location.href = "/subscribe"
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase, redirectTo])

  const handleCheckoutRedirect = async () => {
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        window.location.href = "/dashboard"
      }
    } catch {
      window.location.href = "/dashboard"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setInfo("")

    if (!captchaToken) {
      setError("Por favor, complete a verificação de segurança")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
          captchaToken,
        },
      })

      if (error) {
        if (error.message.includes("already registered")) {
          setError("Este email já está cadastrado. Tente fazer login.")
        } else {
          setError(error.message || "Erro ao criar conta")
        }
        return
      }

      if (data.user) {
        // Preencher perfil com dados da empresa
        await supabase.from("profiles").upsert({
          id: data.user.id,
          name: companyName || data.user.email,
          company_name: companyName || null,
          cnpj: cnpj || null,
          company_email: companyEmail || email,
          phone: phone || null,
        })
        
        // Se houver sessão, confirmação de email está desabilitada
        if (data.session) {
          if (redirectTo === "checkout") {
            handleCheckoutRedirect()
          } else {
            // Novo usuário - sempre vai para subscribe
            window.location.href = "/subscribe"
          }
        } else {
          // Confirmação de email habilitada - mostra mensagem
          setInfo("Conta criada! Verifique seu email para confirmar e depois faça login.")
        }
      }
    } catch (err: any) {
      setError(err.message || "Erro ao processar")
    } finally {
      setLoading(false)
      // Reset CAPTCHA após tentativa
      captchaRef.current?.reset()
      setCaptchaToken(null)
    }
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white text-slate-800 selection:bg-blue-200 min-h-screen relative overflow-hidden flex flex-col">
      <BackgroundDecoration />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[#4B6BFB] shadow-lg shadow-blue-500/25">
                <svg className="h-7 w-7" viewBox="0 0 500 500" fill="none">
                  <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
                  <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
                  <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight">Almox Fácil</span>
            </Link>
            <Link 
              href="/"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1 flex items-center justify-center pt-24 pb-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 w-full max-w-xl p-8 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50"
        >
          <div className="mb-6 flex justify-center items-center">
            <div className="rounded-xl bg-[#4B6BFB] p-2 shadow-lg shadow-blue-500/25">
              <svg className="h-10 w-10" viewBox="0 0 500 500" fill="none">
                <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
                <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
                <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Crie sua conta
            </h1>
            <p className="mt-2 text-slate-600">
              Já tem uma conta?{" "}
              <Link href={`/login${redirectTo ? `?redirect=${redirectTo}` : ""}`} className="text-blue-600 hover:underline font-medium">
                Entre aqui
              </Link>
            </p>
            {redirectTo === "checkout" && (
              <p className="mt-3 text-sm text-blue-600 bg-blue-50 rounded-lg px-4 py-2">
                Após criar sua conta, você será redirecionado para o checkout
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email-input" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password-input" className="mb-1.5 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <input
                id="password-input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nome da Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Sua empresa"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  CNPJ <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="00.000.000/0000-00"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email da empresa <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="contato@empresa.com"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Telefone <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="(00) 00000-0000"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-6 flex justify-center">
              <Turnstile
                ref={captchaRef}
                siteKey="0x4AAAAAACDVBq1Z1dId38ug"
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => {
                  setError("Erro na verificação de segurança. Tente novamente.")
                  setCaptchaToken(null)
                }}
                onExpire={() => setCaptchaToken(null)}
                options={{
                  theme: "light",
                  language: "pt-BR",
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-700 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-xs text-center text-slate-500">
              Ao criar sua conta, você concorda com nossos{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Termos e Condições
              </a>{" "}
              e{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Política de Privacidade
              </a>
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Seus dados estão protegidos conforme a <strong className="text-slate-500">LGPD</strong></span>
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Almox Fácil. Todos os direitos reservados.</p>
            <div className="flex items-center gap-3">
              <a href="mailto:suporte@alnog.com.br" className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-600 transition-all" title="Suporte por email">
                <Mail className="h-4 w-4" />
              </a>
              <a href="https://www.youtube.com/@almoxfacil" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-500 transition-all" title="YouTube - Tutoriais">
                <YouTubeIcon className="h-4 w-4" />
              </a>
              <a href="https://www.instagram.com/almoxfacil" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-pink-100 hover:text-pink-500 transition-all" title="Instagram">
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a href="https://www.linkedin.com/company/almoxfacil" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-600 transition-all" title="LinkedIn">
                <LinkedInIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function BackgroundDecoration() {
  return (
    <>
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='1' stroke='rgb(0 0 0)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      />
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
    </>
  )
}

