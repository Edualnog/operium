import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ConsertosList from "@/components/consertos/ConsertosList"

export default async function ConsertosPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: consertos } = await supabase
    .from("consertos")
    .select("*, ferramentas(*)")
    .eq("profile_id", user.id)
    .order("data_envio", { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consertos</h1>
        <p className="text-muted-foreground">
          Gerencie as ordens de conserto de ferramentas
        </p>
      </div>
      <ConsertosList consertos={consertos || []} />
    </div>
  )
}

