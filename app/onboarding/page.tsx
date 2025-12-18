import { redirect } from "next/navigation"
import { getSupabaseUser } from "@/lib/supabase-server"
import dynamic from "next/dynamic"

const OnboardingSetupForm = dynamic(() => import("@/components/onboarding/OnboardingSetupForm"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 flex items-center justify-center">
            <div className="animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-zinc-200 mx-auto mb-4" />
                <div className="h-6 w-48 bg-zinc-200 rounded mx-auto mb-2" />
                <div className="h-4 w-64 bg-zinc-200 rounded mx-auto" />
            </div>
        </div>
    ),
})

export default async function OnboardingPage() {
    const { supabase, user } = await getSupabaseUser()

    // If not logged in, redirect to login
    if (!user) {
        redirect("/login")
    }

    // Check if user already completed onboarding
    const { data: profile } = await supabase
        .from("profiles")
        .select("company_name, industry_segment")
        .eq("id", user.id)
        .single()

    // If already has both fields, redirect to dashboard
    if (profile?.company_name && profile?.industry_segment) {
        redirect("/dashboard")
    }

    return <OnboardingSetupForm />
}
