"use client"

import * as React from "react"
import { ChevronLeft, Package } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@/lib/supabase-client"

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = React.useState(true)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const router = useRouter()
  const supabase = createClientComponentClient()

  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/dashboard")
        router.refresh()
      }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        window.location.href = "/dashboard"
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setError("Email ou senha incorretos")
          } else if (error.message.includes("Email not confirmed")) {
            setError("Por favor, confirme seu email antes de fazer login")
          } else {
            setError(error.message || "Erro ao fazer login")
          }
          return
        }

        if (data.user && data.session) {
          window.location.href = "/dashboard"
        } else if (data.user) {
          setError("Por favor, confirme seu email antes de fazer login")
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })

        if (error) {
          setError(error.message || "Erro ao criar conta")
          return
        }

        if (data.user) {
          if (data.session) {
            window.location.href = "/dashboard"
          } else {
            setError("Conta criada! Verifique seu email para confirmar a conta antes de fazer login.")
            setIsLogin(true)
          }
        }
      }
    } catch (error: any) {
      setError(error.message || "Erro ao processar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white text-zinc-800 selection:bg-zinc-300 min-h-screen relative overflow-hidden flex items-center justify-center">
      <BackgroundDecoration />
      <BackButton />
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.25, ease: "easeInOut" }}
        className="relative z-10 w-full max-w-xl p-8 bg-white rounded-2xl border border-zinc-200 shadow-2xl"
      >
        <Logo />
        <Header isLogin={isLogin} onToggleMode={() => setIsLogin(!isLogin)} />
        {error && (
          <div className="mb-4 rounded-md bg-red-100 border border-red-300 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Divider />
        <LoginForm
          email={email}
          password={password}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          loading={loading}
          isLogin={isLogin}
        />
        <TermsAndConditions />
      </motion.div>
    </div>
  )
}

const BackButton: React.FC = () => {
  const router = useRouter()
  return (
    <div className="absolute left-4 top-4 z-20">
      <SocialButton 
        icon={<ChevronLeft size={16} />}
        onClick={() => router.push("/")}
      >
        Voltar
      </SocialButton>
    </div>
  )
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
}

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => (
  <button
    className={`rounded-md bg-gradient-to-br from-blue-400 to-blue-700 px-4 py-2 text-lg text-white 
    ring-2 ring-blue-500/50 ring-offset-2 ring-offset-white 
    transition-all hover:scale-[1.02] hover:ring-transparent active:scale-[0.98] active:ring-blue-500/70 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
)

const Logo: React.FC = () => (
  <div className="mb-6 flex justify-center items-center">
    <div className="rounded-lg bg-gradient-to-br from-blue-400 to-blue-700 p-2">
      <Package className="h-8 w-8 text-white" />
    </div>
    <span className="ml-2 text-xl font-bold text-zinc-900">ERP Almoxarifado</span>
  </div>
)

const Header: React.FC<{ isLogin: boolean; onToggleMode: () => void }> = ({ isLogin, onToggleMode }) => (
  <div className="mb-6 text-center">
    <h1 className="text-2xl font-semibold text-zinc-900">
      {isLogin ? "Entre na sua conta" : "Crie sua conta"}
    </h1>
    <p className="mt-2 text-zinc-600">
      {isLogin ? "Não tem uma conta? " : "Já tem uma conta? "}
      <button
        onClick={onToggleMode}
        className="text-blue-600 hover:underline font-medium"
      >
        {isLogin ? "Crie uma." : "Entre."}
      </button>
    </p>
  </div>
)

const SocialButton: React.FC<{
  icon?: React.ReactNode
  fullWidth?: boolean
  children?: React.ReactNode
  onClick?: () => void
}> = ({ icon, fullWidth, children, onClick }) => (
  <button
    onClick={onClick}
    className={`relative z-0 flex items-center justify-center gap-2 overflow-hidden rounded-md 
    border border-zinc-300 bg-zinc-100 
    px-4 py-2 font-semibold text-zinc-800 transition-all duration-500
    before:absolute before:inset-0 before:-z-10 before:translate-x-[150%] before:translate-y-[150%] before:scale-[2.5]
    before:rounded-[100%] before:bg-zinc-800 before:transition-transform before:duration-1000 before:content-[""]
    hover:scale-105 hover:text-white hover:before:translate-x-[0%] hover:before:translate-y-[0%] active:scale-95
    ${fullWidth ? "col-span-2" : ""}`}
  >
    {icon}
    <span>{children}</span>
  </button>
)

const Divider: React.FC = () => (
  <div className="my-6 flex items-center gap-3">
    <div className="h-[1px] w-full bg-zinc-300" />
    <span className="text-zinc-500">OU</span>
    <div className="h-[1px] w-full bg-zinc-300" />
  </div>
)

interface LoginFormProps {
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  isLogin: boolean
}

const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  loading,
  isLogin,
}) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-3">
        <label
          htmlFor="email-input"
          className="mb-1.5 block text-zinc-500"
        >
          Email
        </label>
        <input
          id="email-input"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          disabled={loading}
          className="w-full rounded-md border border-zinc-300 
          bg-white px-3 py-2 text-zinc-800
          placeholder-zinc-400 
          ring-1 ring-transparent transition-shadow focus:outline-0 focus:ring-2 focus:ring-blue-700 disabled:opacity-50"
        />
      </div>
      <div className="mb-6">
        <div className="mb-1.5 flex items-end justify-between">
          <label
            htmlFor="password-input"
            className="block text-zinc-500"
          >
            Senha
          </label>
        </div>
        <input
          id="password-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          disabled={loading}
          minLength={6}
          className="w-full rounded-md border border-zinc-300 
          bg-white px-3 py-2 text-zinc-800
          placeholder-zinc-400 
          ring-1 ring-transparent transition-shadow focus:outline-0 focus:ring-2 focus:ring-blue-700 disabled:opacity-50"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
      </Button>
    </form>
  )
}

const TermsAndConditions: React.FC = () => (
  <p className="mt-9 text-xs text-center text-zinc-500">
    Ao entrar, você concorda com nossos{" "}
    <a href="#" className="text-blue-600 hover:underline">
      Termos e Condições
    </a>{" "}
    e{" "}
    <a href="#" className="text-blue-600 hover:underline">
      Política de Privacidade.
    </a>
  </p>
)

const BackgroundDecoration: React.FC = () => {
  return (
    <>
      {/* Grid pattern covering entire background - sutil em fundo branco */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='1' stroke='rgb(0 0 0)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      />
    </>
  )
}

export default AuthForm
