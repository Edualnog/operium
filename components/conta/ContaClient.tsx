"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Shield,
  ExternalLink,
  Factory,
  Users,
  Lock,
  AlertTriangle
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
import { DeleteAccountModal } from "./DeleteAccountModal"

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
    industry_segment?: string | null
    company_size?: string | null
  } | null
}

export default function ContaClient({ user, profile }: ContaClientProps) {
  const supabase = createClientComponentClient()
  const [form, setForm] = useState({
    cnpj: profile?.cnpj || "",
    phone: profile?.phone || "",
  })

  // Helper para traduzir segmentos
  const getSegmentLabel = (segment: string | null | undefined) => {
    if (!segment) return "-"
    const labels: Record<string, string> = {
      MANUFACTURING: t("onboarding_setup.segments.manufacturing"),
      CONSTRUCTION: t("onboarding_setup.segments.construction"),
      LOGISTICS: t("onboarding_setup.segments.logistics"),
      MAINTENANCE_SERVICES: t("onboarding_setup.segments.maintenance"),
      AGRO: t("onboarding_setup.segments.agro"),
      OTHER: t("onboarding_setup.segments.other"),
    }
    return labels[segment] || segment
  }

  const getSizeLabel = (size: string | null | undefined) => {
    if (!size) return "-"
    const labels: Record<string, string> = {
      SOLO: t("onboarding_setup.sizes.solo"),
      SMALL: t("onboarding_setup.sizes.small"),
      MEDIUM: t("onboarding_setup.sizes.medium"),
      LARGE: t("onboarding_setup.sizes.large"),
      ENTERPRISE: t("onboarding_setup.sizes.enterprise"),
    }
    return labels[size] || size
  }
  const [loading, setLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'pt' ? ptBR : enUS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
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


  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#37352f] dark:text-zinc-50">
          {t("dashboard.conta.title")}
        </h1>
        <p className="text-zinc-500 mt-1 dark:text-zinc-400">
          {t("dashboard.conta.subtitle")}
        </p>
      </div>


      {/* Informações da Conta */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Mail className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
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

      {/* Dados do Onboarding (Imutáveis) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{t("dashboard.conta.onboarding_data.title")}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t("dashboard.conta.onboarding_data.subtitle")}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-zinc-400">{t("dashboard.conta.onboarding_data.company_name")}</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700 dark:text-zinc-200">{profile?.company_name || "-"}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-zinc-400">{t("dashboard.conta.onboarding_data.industry_segment")}</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
              <Factory className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700 dark:text-zinc-200">{getSegmentLabel(profile?.industry_segment)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-600 dark:text-zinc-400">{t("dashboard.conta.onboarding_data.company_size")}</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700 dark:text-zinc-200">{getSizeLabel(profile?.company_size)}</span>
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
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Building2 className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{t("dashboard.conta.company_info.title")}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{t("dashboard.conta.company_info.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">

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
            <Button type="submit" disabled={loading} className="bg-[#37352f] hover:bg-zinc-800 text-white">
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
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Shield className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
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
            className="border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          >
            {t("dashboard.conta.security.send_reset_email")}
          </Button>
        </div>
      </motion.div>

      {/* Zona de Perigo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-red-200 bg-red-50/50 p-6 dark:bg-red-900/10 dark:border-red-800"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              {t("dashboard.conta.danger_zone.title", "Zona de Perigo")}
            </h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              {t("dashboard.conta.danger_zone.subtitle", "Ações irreversíveis")}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-white border border-red-200 dark:bg-zinc-900 dark:border-red-800">
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">
              {t("dashboard.conta.danger_zone.delete_account", "Deletar conta")}
            </p>
            <p className="text-sm text-red-600/70 dark:text-red-400/70">
              {t("dashboard.conta.danger_zone.delete_account_note", "Remove permanentemente sua conta. Dados históricos são preservados.")}
            </p>
          </div>
          <DeleteAccountModal />
        </div>
      </motion.div>
    </div >
  )
}
