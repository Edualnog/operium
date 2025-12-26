import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { TelemetryDashboard } from "@/components/telemetry/TelemetryDashboard"

export const dynamic = "force-dynamic"

// CRITICAL: Only founder can access Telemetry Dashboard
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || "edualnog@gmail.com"

export default async function TelemetryPage() {
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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="p-6 max-w-7xl mx-auto">
                <TelemetryDashboard />
            </div>
        </div>
    )
}
