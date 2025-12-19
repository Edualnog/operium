import { redirect } from "next/navigation"
import { createServerComponentClient } from "@/lib/supabase-server"
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

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function OnboardingPage() {
    const supabase = await createServerComponentClient()

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // If not logged in, redirect to login
    if (authError || !user) {
        redirect("/login")
    }

    // Check if user already completed onboarding
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_name, industry_segment")
        .eq("id", user.id)
        .single()

    // Log for debugging (will appear in Vercel logs)
    console.log("[Onboarding] User:", user.id, "Profile:", profile, "Error:", profileError)

    // If already has both fields, redirect to dashboard
    // This is the PRIMARY check
    if (profile?.company_name && profile?.industry_segment) {
        console.log("[Onboarding] User already completed - redirecting to dashboard")
        redirect("/dashboard")
    }

    // If there was an error reading profile but user exists,
    // still show the form - they need to complete it
    return <OnboardingSetupForm />
}
