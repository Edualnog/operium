"use client"

import * as React from "react"
import { Package, Mail, Linkedin, Globe, ArrowLeft } from "lucide-react"
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
          .select("subscription_status")
          .eq("id", session.user.id)
          .single()

        const activeStatuses = ["active", "trialing"]
        if (profile?.subscription_status && activeStatuses.includes(profile.subscription_status)) {
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

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
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
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <Package className="h-5 w-5 text-white" />
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
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg shadow-blue-500/25">
              <Package className="h-8 w-8 text-white" />
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
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Sua empresa"
                  disabled={loading}
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

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-indigo-700 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-slate-500">
            Ao criar sua conta, você concorda com nossos{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Termos e Condições
            </a>{" "}
            e{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Política de Privacidade
            </a>
          </p>
        </motion.div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Almox Fácil. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <a href="mailto:suporte@almoxfacil.com.br" className="hover:text-blue-600 transition-colors" title="Email">
                <Mail className="h-4 w-4" />
              </a>
              <a href="https://www.linkedin.com/company/almoxfacil" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors" title="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://www.almoxfacil.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors" title="Website">
                <Globe className="h-4 w-4" />
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

