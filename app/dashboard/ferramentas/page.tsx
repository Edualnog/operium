import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import FerramentasList from "@/components/ferramentas/FerramentasList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"

export const revalidate = 60 // Revalidar a cada 60 segundos

async function getFerramentas(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("ferramentas")
    .select("id, nome, categoria, quantidade_total, quantidade_disponivel, estado, created_at")
    .eq("profile_id", userId)
    .order("nome", { ascending: true })
  return data || []
}

async function getColaboradores(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("colaboradores")
    .select("id, nome")
    .eq("profile_id", userId)
    .order("nome", { ascending: true })
  return data || []
}

export default async function FerramentasPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Carregar dados em paralelo
  const [ferramentas, colaboradores] = await Promise.all([
    getFerramentas(user.id),
    getColaboradores(user.id),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ferramentas</h1>
        <p className="text-muted-foreground">
          Gerencie o estoque de ferramentas
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <FerramentasList
          ferramentas={ferramentas}
          colaboradores={colaboradores}
        />
      </Suspense>
    </div>
  )
}

