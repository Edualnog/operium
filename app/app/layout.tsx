import { redirect } from "next/navigation"
import { getSupabaseUser } from "@/lib/supabase-server"

export const metadata = {
    title: "Operium App",
    description: "Painel operacional mobile",
}

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { supabase, user } = await getSupabaseUser()

    if (!user) {
        redirect("/login")
    }

    // Verify user has operium profile (is a collaborator)
    let operiumProfile = null
    try {
        const { data } = await supabase
            .from('operium_profiles')
            .select('role, active')
            .eq('user_id', user.id)
            .eq('active', true)
            .single()

        if (data) {
            operiumProfile = data
        }
    } catch {
        // No operium profile - redirect to main dashboard
        redirect("/dashboard")
    }

    // If no operium profile, they shouldn't be here
    if (!operiumProfile) {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-[#FBFBFA]">
            {children}
        </div>
    )
}
