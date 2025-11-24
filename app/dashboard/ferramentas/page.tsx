import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import FerramentasList from "@/components/ferramentas/FerramentasList"

export default async function FerramentasPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: ferramentas } = await supabase
    .from("ferramentas")
    .select("*")
    .eq("profile_id", user.id)
    .order("nome", { ascending: true })

  const { data: colaboradores } = await supabase
    .from("colaboradores")
    .select("*")
    .eq("profile_id", user.id)
    .order("nome", { ascending: true })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ferramentas</h1>
        <p className="text-muted-foreground">
          Gerencie o estoque de ferramentas
        </p>
      </div>
      <FerramentasList
        ferramentas={ferramentas || []}
        colaboradores={colaboradores || []}
      />
    </div>
  )
}

