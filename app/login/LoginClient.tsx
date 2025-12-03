"use client"




import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Turnstile } from "@marsidev/react-turnstile"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"

function BackgroundDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-100/30 blur-3xl" />
      <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-100/30 blur-3xl" />
    </div>
  )
}

import { Suspense } from "react"

function LoginForm() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [info, setInfo] = React.useState("")

  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null)
  const captchaRef = React.useRef<any>(null)
  const [mounted, setMounted] = React.useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"
  const redirectTo = searchParams.get("redirect")

  React.useEffect(() => {
    setMounted(true)
    if (turnstileSiteKey.startsWith("1x0000")) {
      console.warn("⚠️ Usando chave de teste do Turnstile. Isso falhará em produção se o Supabase esperar uma chave real.")
      console.warn("Verifique se NEXT_PUBLIC_TURNSTILE_SITE_KEY está configurada no Vercel.")
    }
  }, [turnstileSiteKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setInfo("")

    if (!captchaToken) {
      setError("Por favor, complete a verificação de segurança.")
      setLoading(false)
      return
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      })

      if (signInError) {
        throw signInError
      }

      // Sucesso - o middleware ou o useEffect de authStateChange cuidará do redirecionamento
      // Mas podemos forçar aqui para garantir
      if (redirectTo === "checkout") {
        // Se o usuário está fazendo login, verificamos se ele já tem assinatura no middleware/layout
        // Mas por padrão, mandamos para o dashboard para verificar status
        router.push("/dashboard")
      } else {
        router.push("/dashboard")
      }

    } catch (err: any) {
      console.error("Login error:", err)
      if (err.message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos.")
      } else if (err.message.includes("Email not confirmed")) {
        setError("Email não confirmado. Verifique sua caixa de entrada.")
      } else {
        setError(err.message || "Ocorreu um erro ao entrar. Tente novamente.")
      }
      setCaptchaToken(null)
      captchaRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError("Digite seu email para recuperar a senha.")
      return
    }

    if (!captchaToken) {
      setError("Por favor, complete a verificação de segurança para recuperar a senha.")
      return
    }

    setLoading(true)
    setError("")
    setInfo("")

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
        captchaToken,
      })

      if (resetError) {
        throw resetError
      }

      setInfo("Email de recuperação enviado! Verifique sua caixa de entrada.")
    } catch (err: any) {
      console.error("Reset password error:", err)
      setError(err.message || "Erro ao enviar email de recuperação.")
    } finally {
      setLoading(false)
      setCaptchaToken(null)
      captchaRef.current?.reset()
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
                  <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round" />
                  <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round" />
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

      <div className="flex-1 flex items-center justify-center pt-20 sm:pt-24 pb-8 sm:pb-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md p-5 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50"
        >
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-slate-600">
              Não tem uma conta?{" "}
              <Link href={`/signup${redirectTo ? `?redirect=${redirectTo}` : ""}`} className="text-blue-600 hover:underline font-medium">
                Crie agora
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:py-2.5 text-base sm:text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:py-2.5 pr-12 text-base sm:text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="mb-5 sm:mb-6 flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                disabled={loading}
              >
                Esqueceu a senha?
              </button>
            </div>

            <div className="mb-5 sm:mb-6 flex justify-center min-h-[65px]">
              {mounted && (
                <Turnstile
                  ref={captchaRef}
                  siteKey={turnstileSiteKey}
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
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !captchaToken}
              className="w-full rounded-xl bg-[#4B6BFB] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <LoginForm />
    </Suspense>
  )
}
