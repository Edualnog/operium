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
import { enUS } from "date-fns/locale/en-US"
import { useTranslation } from "react-i18next"

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
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'pt' ? ptBR : enUS

  const getStatusInfo = () => {
    // Prioridade para status explícito do Stripe
    if (subscriptionStatus === "active") {
      return {
        label: t("dashboard.conta.plan.professional"),
        color: "bg-green-500 dark:bg-green-600",
        textColor: "text-green-700 dark:text-green-300",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        icon: Crown,
        description: t("dashboard.conta.plan.full_access")
      }
    }

    if (subscriptionStatus === "trialing") {
      return {
        label: t("dashboard.conta.plan.free_trial"),
        color: "bg-blue-500 dark:bg-blue-600",
        textColor: "text-blue-700 dark:text-blue-300",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        icon: Zap,
        description: t("dashboard.conta.plan.trial_days")
      }
    }

    if (subscriptionStatus === "past_due") {
      return {
        label: t("dashboard.conta.plan.pending_payment"),
        color: "bg-amber-500 dark:bg-amber-600",
        textColor: "text-amber-700 dark:text-amber-300",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: CreditCard,
        description: t("dashboard.conta.plan.update_payment")
      }
    }

    if (subscriptionStatus === "canceled") {
      return {
        label: t("dashboard.conta.plan.canceled"),
        color: "bg-red-500 dark:bg-red-600",
        textColor: "text-red-700 dark:text-red-300",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
        icon: Shield,
        description: t("dashboard.conta.plan.subscription_canceled")
      }
    }

    // Se não tem status do Stripe, verifica nosso trial interno
    if (trialStatus.isInTrial) {
      return {
        label: t("dashboard.conta.plan.free_trial"),
        color: "bg-blue-500 dark:bg-blue-600",
        textColor: "text-blue-700 dark:text-blue-300",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        icon: Zap,
        description: t("dashboard.conta.plan.trial_remaining", { days: trialStatus.daysRemaining })
      }
    }

    if (hasStripeCustomer) {
      // Se tem customer ID mas não tem status ativo/trialing, provavelmente é um checkout incompleto ou cancelado
      // Não devemos mostrar como Profissional
      return {
        label: t("dashboard.conta.plan.no_plan"),
        color: "bg-slate-400",
        textColor: "text-slate-700",
        bgColor: "bg-slate-50",
        borderColor: "border-slate-200",
        icon: User,
        description: t("dashboard.conta.plan.subscribe_full")
      }
    }

    return {
      label: t("dashboard.conta.plan.no_plan"),
      color: "bg-slate-400 dark:bg-slate-600",
      textColor: "text-slate-700 dark:text-slate-300",
      bgColor: "bg-slate-50 dark:bg-zinc-800",
      borderColor: "border-slate-200 dark:border-zinc-700",
      icon: User,
      description: t("dashboard.conta.plan.subscribe_full")
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

  const handleSubscribe = () => {
    window.location.href = "/subscribe"
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
      setMessage({ type: "success", text: t("dashboard.conta.company_info.success") })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || t("dashboard.conta.company_info.error") })
    } finally {
      setLoading(false)
    }
  }

  const planFeatures = [
    t("dashboard.conta.features.unlimited_stock"),
    t("dashboard.conta.features.unlimited_users"),
    t("dashboard.conta.features.unlimited_tools"),
    t("dashboard.conta.features.full_movements"),
    t("dashboard.conta.features.advanced_reports"),
    t("dashboard.conta.features.industrial_dashboard"),
    t("dashboard.conta.features.repair_management"),
    t("dashboard.conta.features.email_support")
  ]

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
          {t("dashboard.conta.title")}
        </h1>
        <p className="text-slate-600 mt-1 dark:text-zinc-400">
          {t("dashboard.conta.subtitle")}
        </p>
      </div>

      {/* Plano Atual */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border-2 ${statusInfo.borderColor} ${statusInfo.bgColor} p-6 dark:bg-zinc-900 dark:border-zinc-800`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${statusInfo.color} text-white`}>
              <StatusIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50">
                  {statusInfo.label}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.textColor} ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
                  {t("dashboard.conta.plan.active")}
                </span>
              </div>
              <p className="text-slate-600 mt-1 dark:text-zinc-400">
                {statusInfo.description}
              </p>
              {(subscriptionStatus === "active" || subscriptionStatus === "trialing" || hasStripeCustomer) && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-slate-400 line-through">R$ 69,90</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">R$ 49,75/mês</span>
                  <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium dark:bg-green-900/30 dark:text-green-400">29% OFF</span>
                </div>
              )}
            </div>
          </div>

          {profile?.stripe_customer_id && (subscriptionStatus === "active" || subscriptionStatus === "trialing") ? (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {portalLoading ? t("dashboard.conta.subscription.opening") : t("dashboard.conta.subscription.manage")}
              <ExternalLink className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={subscribeLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {subscribeLoading ? t("dashboard.conta.subscription.processing") : t("dashboard.conta.subscription.subscribe_now")}
              <Crown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Features do plano */}
        {(subscriptionStatus === "active" || subscriptionStatus === "trialing" || hasStripeCustomer) && (
          <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-zinc-800">
            <p className="text-sm font-medium text-slate-700 mb-3 dark:text-zinc-300">{t("dashboard.conta.subscription.included")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {planFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
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
        className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800">
            <Mail className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{t("dashboard.conta.account_info.title")}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t("dashboard.conta.account_info.subtitle")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-zinc-400">Email</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700 dark:text-zinc-200">{user.email}</span>
            </div>
            <p className="text-xs text-slate-500">
              {t("dashboard.conta.account_info.email_note")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-zinc-400">{t("dashboard.conta.account_info.member_since")}</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700 dark:text-zinc-200">
                {user.created_at
                  ? format(new Date(user.created_at), "PPP", { locale: dateLocale })
                  : t("dashboard.conta.account_info.date_unavailable")
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
        className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800">
            <Building2 className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{t("dashboard.conta.company_info.title")}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t("dashboard.conta.company_info.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company_name" className="dark:text-zinc-300">{t("dashboard.conta.company_info.company_name")}</Label>
              <Input
                id="company_name"
                value={form.company_name}
                onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder={t("dashboard.conta.company_info.company_name")}
                className="bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj" className="dark:text-zinc-300">{t("dashboard.conta.company_info.cnpj")}</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm(f => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                className="bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="phone" className="dark:text-zinc-300">{t("dashboard.conta.company_info.phone")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="bg-white pl-10 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
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
              {loading ? t("dashboard.conta.company_info.saving") : t("dashboard.conta.company_info.save_changes")}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Segurança */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800">
            <Shield className="h-5 w-5 text-slate-600 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{t("dashboard.conta.security.title")}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t("dashboard.conta.security.subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
          <div>
            <p className="font-medium text-slate-700 dark:text-zinc-200">{t("dashboard.conta.security.change_password")}</p>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t("dashboard.conta.security.change_password_note")}</p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
              })
              setMessage({ type: "success", text: t("dashboard.conta.security.reset_email_sent") })
            }}
          >
            {t("dashboard.conta.security.send_reset_email")}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

