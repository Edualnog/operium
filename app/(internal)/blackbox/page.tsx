import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { ObservabilityDashboard } from "@/components/observability/ObservabilityDashboard"
import { ExportCenter } from "@/components/export/ExportCenter"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
            <Tabs defaultValue="observability" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="observability">
                        🔭 Observabilidade
                    </TabsTrigger>
                    <TabsTrigger value="export">
                        📁 Exportar Dados
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="observability">
                    <ObservabilityDashboard />
                </TabsContent>

                <TabsContent value="export">
                    <ExportCenter />
                </TabsContent>
            </Tabs>
        </div>
    )
}
