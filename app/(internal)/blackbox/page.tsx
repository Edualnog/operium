import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ExportCenter } from "@/components/export/ExportCenter"

export const dynamic = "force-dynamic"

export default async function ExportPage() {
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <ExportCenter />
        </div>
    )
}
