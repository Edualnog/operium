"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Turnstile } from "@marsidev/react-turnstile"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

function BackgroundDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-100/30 blur-3xl" />
      <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-100/30 blur-3xl" />
    </div>
  )
}

function SignupForm() {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [info, setInfo] = React.useState("")
  const { t } = useTranslation('common')

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
      setError(t('auth.errors.captcha_required'))
      setLoading(false)
      return
    }

    try {
      const signUpOptions: Record<string, any> = {
        emailRedirectTo: `${window.location.origin}/auth/verify`,
        captchaToken,
        data: {
          full_name: name,
        }
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: signUpOptions,
      })

      if (signUpError) {
        throw signUpError
      }

      if (data.user) {
        // Se houver sessão (login automático ou dev), cria o perfil
        if (data.session) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            name: name || data.user.email?.split("@")[0] || "Usuário",
            company_name: "Minha Empresa", // Placeholder
            cnpj: null,
            company_email: email,
            phone: null,
            trial_start_date: new Date().toISOString(),
            subscription_status: 'trialing',
          })

          if (redirectTo === "checkout") {
            // IGNORAR checkout no cadastro - forçar fluxo de trial
            router.push("/dashboard/setup")
          } else {
            router.push("/dashboard/setup")
          }
        } else {
          // Sem sessão: email de confirmação enviado
          setInfo(t('auth.success.account_created'))
          // Limpar formulário
          setName("")
          setEmail("")
          setPassword("")
          setCaptchaToken(null)
          captchaRef.current?.reset()
        }
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message || t('auth.errors.generic_signup'))
      setCaptchaToken(null)
      captchaRef.current?.reset()
    } finally {
      setLoading(false)
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
              {t('auth.back')}
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex-1 flex items-center justify-center pt-20 sm:pt-24 pb-8 sm:pb-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 w-full max-w-xl p-5 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50"
        >
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-900">
              {t('auth.signup.title')}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-600">
              {t('auth.signup.subtitle')}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t('auth.signup.has_account')}{" "}
              <Link href={`/login${redirectTo ? `?redirect=${redirectTo}` : ""}`} className="text-blue-600 hover:underline font-medium">
                {t('auth.signup.login_here')}
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
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-700">
                {t('auth.fields.name')}
              </label>
              <input
                id="name"
                type="text"
                placeholder={t('auth.placeholders.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:py-2.5 text-base sm:text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 dark:bg-white dark:text-slate-800 dark:border-slate-300 dark:placeholder-slate-400"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-700">
                {t('auth.fields.email')}
              </label>
              <input
                id="email"
                type="email"
                placeholder={t('auth.placeholders.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:py-2.5 text-base sm:text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 dark:bg-white dark:text-slate-800 dark:border-slate-300 dark:placeholder-slate-400"
              />
            </div>

            <div className="mb-5 sm:mb-6">
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-700">
                {t('auth.fields.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.placeholders.password_min')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 sm:py-2.5 pr-12 text-base sm:text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 dark:bg-white dark:text-slate-800 dark:border-slate-300 dark:placeholder-slate-400"
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
              {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            {t('auth.signup.terms_agreement')}{" "}
            <Link href="/terms" className="text-blue-600 hover:underline">
              {t('auth.signup.terms')}
            </Link>{" "}
            e{" "}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              {t('auth.signup.privacy')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function SignupClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <SignupForm />
    </Suspense>
  )
}
