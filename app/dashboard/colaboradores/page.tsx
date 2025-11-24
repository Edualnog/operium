import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import ColaboradoresList from "@/components/colaboradores/ColaboradoresList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"

export const revalidate = 60 // Revalidar a cada 60 segundos

async function getColaboradores(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("colaboradores")
    .select("id, nome, cargo, telefone, created_at")
    .eq("profile_id", userId)
    .order("nome", { ascending: true })
  return data || []
}

export default async function ColaboradoresPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const colaboradores = await getColaboradores(user.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
        <p className="text-muted-foreground">
          Gerencie os colaboradores do seu almoxarifado
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <ColaboradoresList colaboradores={colaboradores} />
      </Suspense>
    </div>
  )
}

