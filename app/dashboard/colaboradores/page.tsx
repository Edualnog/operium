import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import ColaboradoresList from "@/components/colaboradores/ColaboradoresList"

export default async function ColaboradoresPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: colaboradores } = await supabase
    .from("colaboradores")
    .select("*")
    .eq("profile_id", user.id)
    .order("nome", { ascending: true })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
        <p className="text-muted-foreground">
          Gerencie os colaboradores do seu almoxarifado
        </p>
      </div>
      <ColaboradoresList colaboradores={colaboradores || []} />
    </div>
  )
}

