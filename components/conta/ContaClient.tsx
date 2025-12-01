"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Building2,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  Crown,
  Zap,
  Check,
  ExternalLink,
  Shield
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@/lib/supabase-client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

import { checkTrialStatus } from "@/lib/utils"

// ... imports

interface ContaClientProps {
  user: {
    id: string
    email: string
    created_at: string
  }
  profile: {
    id: string
    name?: string | null
    company_name?: string | null
    cnpj?: string | null
    company_email?: string | null
    phone?: string | null
    subscription_status?: string | null
    stripe_customer_id?: string | null
    created_at?: string | null
    trial_start_date?: string | null
  } | null
}

export default function ContaClient({ user, profile }: ContaClientProps) {
  const supabase = createClientComponentClient()
  const [form, setForm] = useState({
    company_name: profile?.company_name || "",
    cnpj: profile?.cnpj || "",
    phone: profile?.phone || "",
  })
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const subscriptionStatus = profile?.subscription_status || "inactive"
  const hasStripeCustomer = !!profile?.stripe_customer_id
  const trialStatus = checkTrialStatus(profile?.trial_start_date)

  const getStatusInfo = () => {
    // Prioridade para status explícito do Stripe
    if (subscriptionStatus === "active") {
      return {
        label: "Profissional",
        color: "bg-green-500",
        textColor: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: Crown,
        description: "Acesso completo a todas as funcionalidades"
      }
    }

    if (subscriptionStatus === "trialing") {
      return {
        label: "Teste Grátis",
        color: "bg-blue-500",
        textColor: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: Zap,
        description: "7 dias de acesso completo para experimentar"
      }
    }

    if (subscriptionStatus === "past_due") {
      return {
        label: "Pagamento Pendente",
        color: "bg-amber-500",
        textColor: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        icon: CreditCard,
        description: "Atualize sua forma de pagamento"
      }
    }

    if (subscriptionStatus === "canceled") {
      return {
        label: "Cancelado",
        color: "bg-red-500",
        textColor: "text-red-700",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: Shield,
        description: "Sua assinatura foi cancelada"
      }
    }

    // Se não tem status do Stripe, verifica nosso trial interno
    if (trialStatus.isInTrial) {
      return {
        label: "Teste Grátis",
        color: "bg-blue-500",
        textColor: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: Zap,
        description: `Restam ${trialStatus.daysRemaining} dias de acesso gratuito`
      }
    }

    if (hasStripeCustomer) {
      // Fallback para quem já é cliente mas status não bateu
      return {
        label: "Profissional",
        color: "bg-green-500",
        textColor: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: Crown,
        description: "Acesso completo a todas as funcionalidades"
      }
    }

    return {
      label: "Sem Plano",
      color: "bg-slate-400",
      textColor: "text-slate-700",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      icon: User,
      description: "Assine para acessar todas as funcionalidades"
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao abrir portal")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao abrir gerenciamento de assinatura" })
      setPortalLoading(false)
    }
  }

  const [subscribeLoading, setSubscribeLoading] = useState(false)

  const handleSubscribe = async () => {
    setSubscribeLoading(true)
    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao iniciar checkout")
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao iniciar assinatura" })
      setSubscribeLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: form.company_name || null,
          cnpj: form.cnpj || null,
          phone: form.phone || null,
          company_email: user.email,
        })
        .eq("id", user.id)

      if (error) throw error
      setMessage({ type: "success", text: "Dados atualizados com sucesso!" })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erro ao salvar dados" })
    } finally {
      setLoading(false)
    }
  }

  const planFeatures = [
    "Estoque ilimitado",
    "Colaboradores ilimitados",
    "Ferramentas ilimitadas",
    "Movimentações completas",
    "Relatórios avançados",
    "Dashboard industrial",
    "Gestão de consertos",
    "Suporte por email"
  ]

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Minha Conta
        </h1>
        <p className="text-slate-600 mt-1">
          Gerencie sua assinatura e dados da empresa
        </p>
      </div>

      {/* Plano Atual */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} p-6`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${statusInfo.color} text-white`}>
              <StatusIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Plano {statusInfo.label}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.textColor} ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
                  Ativo
                </span>
              </div>
              <p className="text-slate-600 mt-1">
                {statusInfo.description}
              </p>
              {(subscriptionStatus === "active" || subscriptionStatus === "trialing" || hasStripeCustomer) && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400 line-through">R$ 69,90</span>
                  <span className="text-sm font-semibold text-slate-700">R$ 39,90/mês</span>
                  <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">43% OFF</span>
                </div>
              )}
            </div>
          </div>

          {profile?.stripe_customer_id && (subscriptionStatus === "active" || subscriptionStatus === "trialing") ? (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {portalLoading ? "Abrindo..." : "Gerenciar assinatura"}
              <ExternalLink className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={subscribeLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subscribeLoading ? "Processando..." : "Assinar Agora"}
              <Crown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Features do plano */}
        {(subscriptionStatus === "active" || subscriptionStatus === "trialing" || hasStripeCustomer) && (
          <div className="mt-6 pt-6 border-t border-slate-200/50">
            <p className="text-sm font-medium text-slate-700 mb-3">Incluído no seu plano:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {planFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Informações da Conta */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-slate-100">
            <Mail className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Informações da Conta</h3>
            <p className="text-sm text-slate-500">Dados vinculados ao seu login</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-slate-600">Email</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">{user.email}</span>
            </div>
            <p className="text-xs text-slate-500">
              Este é o email usado para login e notificações
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600">Membro desde</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700">
                {user.created_at
                  ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : "Data não disponível"
                }
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dados da Empresa */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-slate-100">
            <Building2 className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Dados da Empresa</h3>
            <p className="text-sm text-slate-500">Informações para identificação</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Nome da Empresa</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder="Sua empresa"
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm(f => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                className="bg-white"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="bg-white pl-10"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
              }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Segurança */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-slate-100">
            <Shield className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Segurança</h3>
            <p className="text-sm text-slate-500">Opções de segurança da conta</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <p className="font-medium text-slate-700">Alterar senha</p>
            <p className="text-sm text-slate-500">Recomendamos alterar sua senha periodicamente</p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
              })
              setMessage({ type: "success", text: "Email de recuperação enviado!" })
            }}
          >
            Enviar email de redefinição
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

