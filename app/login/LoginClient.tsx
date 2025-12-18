"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Turnstile } from "@marsidev/react-turnstile"
import { motion } from "framer-motion"
import { ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Quote } from "lucide-react"
import { useToast } from "@/components/ui/toast-context"
import { useTranslation } from "react-i18next"
import { Suspense } from "react"

// Minimalist background without heavy gradients
function BackgroundDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-zinc-50">
      {/* Subtle grid pattern could go here, or just clean zinc-50 */}
      <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const { t } = useTranslation('common')
  const { toast } = useToast()

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

    if (!captchaToken) {
      toast.error(t('auth.errors.captcha_required'))
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

      if (redirectTo === "checkout") {
        router.push("/dashboard")
      } else {
        router.push("/dashboard")
      }

    } catch (err: any) {
      console.error("Login error:", err)
      if (err.message.includes("Invalid login credentials")) {
        toast.error(t('auth.errors.invalid_credentials'))
      } else if (err.message.includes("Email not confirmed")) {
        toast.error(t('auth.errors.email_not_confirmed'))
      } else {
        toast.error(err.message || t('auth.errors.generic_login'))
      }
      setCaptchaToken(null)
      captchaRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      toast.error(t('auth.errors.email_required_reset'))
      return
    }

    if (!captchaToken) {
      toast.error(t('auth.errors.captcha_required'))
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
        captchaToken,
      })

      if (resetError) {
        throw resetError
      }

      toast.success(t('auth.success.reset_email_sent'))
    } catch (err: any) {
      console.error("Reset password error:", err)
      toast.error(err.message || t('auth.errors.generic_login'))
    } finally {
      setLoading(false)
      setCaptchaToken(null)
      captchaRef.current?.reset()
    }
  }

  const [googleLoading, setGoogleLoading] = React.useState(false)

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      // Importar dinamicamente para evitar problemas de SSR
      const { getOAuthClient } = await import('@/lib/supabase-client')
      const oauthClient = getOAuthClient()

      const { data, error } = await oauthClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      })
      if (error) throw error
      // Se chegou aqui sem redirecionar, algo deu errado
      if (!data.url) {
        throw new Error('No redirect URL returned')
      }
    } catch (err: any) {
      console.error("Google login error:", err)
      toast.error(err.message || "Erro ao entrar com Google")
      setGoogleLoading(false)
    }
  }


  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center font-sans text-zinc-900 bg-zinc-50">
      <BackgroundDecoration />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[400px] p-8 sm:p-10 bg-white rounded-xl shadow-xl shadow-zinc-200/50 border border-zinc-200/60"
      >
        {/* Logo Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">
            {t('auth.login.title')}
          </h1>
          <p className="mt-3 text-zinc-500 text-sm">
            {t('auth.login.no_account')}{" "}
            <Link href={`/signup${redirectTo ? `?redirect=${redirectTo}` : ""}`} className="text-zinc-900 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-900 hover:text-black transition-all font-medium">
              {t('auth.login.create_now')}
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
              {t('auth.fields.email')}
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
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
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline transition-colors"
                disabled={loading}
              >
                {t('auth.login.forgot_password')}
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
                  toast.error("Erro na verificação de segurança. Tente novamente.")
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
                {t('auth.login.submitting')}
              </span>
            ) : (
              t('auth.login.submit')
            )}
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-zinc-400">{t('auth.or') || 'ou'}</span>
            </div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full rounded-lg bg-white border border-zinc-200 text-zinc-700 font-medium py-3 px-4 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {t('auth.google_login') || 'Entrar com Google'}
          </button>
        </form>
      </motion.div>

      {/* Footer / Back Link */}
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

export default function LoginClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50"><div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div></div>}>
      <LoginForm />
    </Suspense>
  )
}
