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
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-zinc-50">
      <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
        if (data.session) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            name: name || data.user.email?.split("@")[0] || "Usuário",
            company_name: "Minha Empresa",
            cnpj: null,
            company_email: email,
            phone: null,
            trial_start_date: new Date().toISOString(),
            subscription_status: 'trialing',
          })

          router.push("/dashboard/setup")
        } else {
          setInfo(t('auth.success.account_created'))
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
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-sans text-zinc-900 bg-zinc-50">
      <BackgroundDecoration />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] p-8 sm:p-10 bg-white rounded-xl shadow-xl shadow-zinc-200/50 border border-zinc-200/60"
      >
        {/* Logo Operium */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" className="flex-shrink-0">
              {/* Top left vertical bar */}
              <rect x="10" y="10" width="15" height="40" fill="currentColor" className="text-zinc-900" />
              {/* Top horizontal bar */}
              <rect x="10" y="10" width="40" height="15" fill="currentColor" className="text-zinc-900" />
              {/* Bottom horizontal bar */}
              <rect x="50" y="75" width="40" height="15" fill="currentColor" className="text-zinc-900" />
              {/* Bottom right vertical bar */}
              <rect x="75" y="50" width="15" height="40" fill="currentColor" className="text-zinc-900" />
            </svg>
            <span className="font-semibold text-zinc-900 text-2xl tracking-wider">OPERIUM</span>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">
            {t('auth.signup.title')}
          </h1>
          <p className="mt-3 text-zinc-500 text-sm">
            {t('auth.signup.has_account')}{" "}
            <Link href={`/login${redirectTo ? `?redirect=${redirectTo}` : ""}`} className="text-zinc-900 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-900 hover:text-black transition-all font-medium">
              {t('auth.signup.login_here')}
            </Link>
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50/50 border border-red-100 p-3 text-xs text-red-600 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="mb-6 rounded-md bg-green-50/50 border border-green-100 p-3 text-xs text-green-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
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
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 pr-10 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-2">
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
                  size: "flexible"
                }}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full rounded-lg bg-zinc-900 text-white font-medium py-3 px-4 shadow-lg shadow-zinc-300 hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('auth.signup.submitting')}
              </span>
            ) : (
              t('auth.signup.submit')
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-zinc-400 leading-relaxed">
          {t('auth.signup.terms_agreement')}{" "}
          <Link href="/terms" className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
            {t('auth.signup.terms')}
          </Link>{" "}
          e{" "}
          <Link href="/privacy" className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
            {t('auth.signup.privacy')}
          </Link>
        </p>
      </motion.div>

      <div className="relative z-10 mt-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.back')}
        </Link>
      </div>
    </div>
  )
}

export default function SignupClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50"><div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div></div>}>
      <SignupForm />
    </Suspense>
  )
}
