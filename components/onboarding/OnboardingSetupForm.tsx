"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Factory, Truck, Wrench, Wheat, HelpCircle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientComponentClient } from "@/lib/supabase-client"
import { useTranslation } from "react-i18next"

const INDUSTRY_SEGMENTS = [
    { value: "MANUFACTURING", labelKey: "onboarding_setup.segments.manufacturing", icon: Factory },
    { value: "CONSTRUCTION", labelKey: "onboarding_setup.segments.construction", icon: Building2 },
    { value: "LOGISTICS", labelKey: "onboarding_setup.segments.logistics", icon: Truck },
    { value: "MAINTENANCE_SERVICES", labelKey: "onboarding_setup.segments.maintenance", icon: Wrench },
    { value: "AGRO", labelKey: "onboarding_setup.segments.agro", icon: Wheat },
    { value: "OTHER", labelKey: "onboarding_setup.segments.other", icon: HelpCircle },
] as const

export default function OnboardingSetupForm() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { t } = useTranslation()

    const [companyName, setCompanyName] = useState("")
    const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const isValid = companyName.trim().length >= 2 && selectedSegment !== null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!isValid) return

        setLoading(true)
        setError("")

        try {
            const response = await fetch("/api/onboarding/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company_name: companyName.trim(),
                    industry_segment: selectedSegment,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || t("onboarding_setup.errors.generic"))
            }

            // Redirect to dashboard
            router.push("/dashboard")
            router.refresh()
        } catch (err: any) {
            setError(err.message || t("onboarding_setup.errors.generic"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                        {t("onboarding_setup.title")}
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {t("onboarding_setup.subtitle")}
                    </p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-6">
                    {/* Company Name */}
                    <div className="space-y-2">
                        <Label htmlFor="company_name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {t("onboarding_setup.company_name.label")} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="company_name"
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={t("onboarding_setup.company_name.placeholder")}
                            className="h-12 text-base"
                            autoFocus
                            required
                            minLength={2}
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {t("onboarding_setup.company_name.hint")}
                        </p>
                    </div>

                    {/* Industry Segment */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {t("onboarding_setup.segment.label")} <span className="text-red-500">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            {INDUSTRY_SEGMENTS.map((segment) => {
                                const Icon = segment.icon
                                const isSelected = selectedSegment === segment.value
                                return (
                                    <button
                                        key={segment.value}
                                        type="button"
                                        onClick={() => setSelectedSegment(segment.value)}
                                        className={`
                      flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                      ${isSelected
                                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
                                                : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/50"
                                            }
                    `}
                                    >
                                        <div className={`
                      flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                      ${isSelected
                                                ? "bg-emerald-500 text-white"
                                                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                                            }
                    `}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={`
                      text-sm font-medium
                      ${isSelected
                                                ? "text-emerald-700 dark:text-emerald-400"
                                                : "text-zinc-700 dark:text-zinc-300"
                                            }
                    `}>
                                            {t(segment.labelKey)}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={!isValid || loading}
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                {t("onboarding_setup.button.loading")}
                            </>
                        ) : (
                            <>
                                {t("onboarding_setup.button.submit")}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
                    {t("onboarding_setup.footer")}
                </p>
            </div>
        </div>
    )
}
