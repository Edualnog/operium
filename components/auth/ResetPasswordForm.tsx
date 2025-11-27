"use client"

import * as React from "react"
import { Package, Lock, CheckCircle2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordForm() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState(false)
  const [status, setStatus] = React.useState<"checking" | "ready" | "error">("checking")
  const [statusMessage, setStatusMessage] = React.useState("Validando link...")

  React.useEffect(() => {
    const processLink = async () => {
      if (typeof window === "undefined") return

      setStatus("checking")
      setStatusMessage("Validando link de recuperação...")

      try {
        const url = new URL(window.location.href)
        const params = url.searchParams
        const code = params.get("code")
        const token = params.get("token")
        const tokenHash = params.get("token_hash")
        const typeParam = params.get("type") || "recovery"

        // 1. Tentar obter sessão atual (Supabase pode já ter processado)
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.user) {
          setStatus("ready")
          return
        }

        // 2. Se houver code (PKCE), trocar por sessão
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            throw error
          }

          const { data: { session: newSession } } = await supabase.auth.getSession()
          if (newSession && newSession.user) {
            setStatus("ready")
            return
          }

          throw new Error("Link de recuperação inválido ou já utilizado. Solicite um novo link.")
        }

        // 3. Se houver token/token_hash (modo OTP), verificar
        if (token || tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash || token || "",
            type: typeParam as any,
          })

          if (error) {
            throw error
          }

          setStatus("ready")
          return
        }

        throw new Error("Link de recuperação inválido ou expirado. Solicite um novo link.")
      } catch (err: any) {
        console.error("Erro ao validar link de recuperação:", err)
        setError(err.message || "Link de recuperação inválido ou expirado. Solicite um novo link.")
        setStatus("error")
      }
    }

    processLink()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validações
    if (!password) {
      setError("Por favor, informe a nova senha.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      setLoading(false)
      return
    }

    try {
      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      // Senha atualizada com sucesso
      setSuccess(true)
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push("/login?success=password_reset&message=" + encodeURIComponent("Senha alterada com sucesso! Faça login com sua nova senha."))
      }, 2000)

    } catch (err: any) {
      let errorMessage = "Erro ao alterar a senha. Por favor, tente novamente."
      
      if (err.message.includes("expired") || err.message.includes("invalid")) {
        errorMessage = "Link de recuperação expirado ou inválido. Por favor, solicite um novo link."
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (status === "checking") {
    return (
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {statusMessage}
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Link inválido
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {error || "O link de recuperação expirou ou já foi utilizado. Solicite um novo link para continuar."}
            </p>
          </div>
          <Button onClick={() => router.push("/login")} className="w-full">
            Voltar para o login
          </Button>
        </div>
      </motion.div>
    )
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Senha Alterada!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sua senha foi alterada com sucesso. Redirecionando para o login...
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 bg-[#4B6BFB] rounded-lg flex items-center justify-center p-1.5">
            <svg className="w-full h-full" viewBox="0 0 500 500" fill="none">
              <path d="M250 100 L380 175 L250 250 L120 175 Z" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
              <path d="M120 235 L250 310 L380 235" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
              <path d="M120 295 L250 370 L380 295" stroke="white" strokeWidth="28" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            Almox Fácil
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Redefinir Senha
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Digite sua nova senha abaixo
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
            Nova Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="password"
              type="password"
              placeholder="Digite sua nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">
            Confirmar Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
          disabled={loading}
        >
          {loading ? "Alterando senha..." : "Alterar Senha"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.push("/login")}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Voltar para o login
        </button>
      </div>
    </motion.div>
  )
}

