import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { BlackboxTabs } from "@/components/blackbox/BlackboxTabs"

export const dynamic = "force-dynamic"

// CRITICAL: Only founder can access Blackbox
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || "edualnog@gmail.com"

export default async function BlackboxPage() {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // SECURITY: Restrict access to founder only
    if (user.email !== FOUNDER_EMAIL) {
        redirect("/dashboard")
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <BlackboxTabs />
        </div>
    )
}

