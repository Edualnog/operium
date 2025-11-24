import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import ConsertosList from "@/components/consertos/ConsertosList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"

export const revalidate = 60 // Revalidar a cada 60 segundos

async function getConsertos(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("consertos")
    .select(`
      id,
      ferramenta_id,
      descricao,
      status,
      custo,
      data_envio,
      data_retorno,
      ferramentas (
        id,
        nome,
        quantidade_disponivel
      )
    `)
    .eq("profile_id", userId)
    .order("data_envio", { ascending: false })
  return data || []
}

export default async function ConsertosPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const consertos = await getConsertos(user.id)

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900">Consertos</h1>
        <p className="text-sm sm:text-base text-zinc-600 mt-1.5">
          Gerencie as ordens de conserto de ferramentas
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <ConsertosList consertos={consertos} />
      </Suspense>
    </div>
  )
}

