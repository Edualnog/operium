import { createServerComponentClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import MovimentacoesList from "@/components/movimentacoes/MovimentacoesList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"

export const revalidate = 60

async function getMovimentacoes(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("movimentacoes")
    .select(
      "id, tipo, quantidade, observacoes, data, created_at, ferramentas(nome, tipo_item), colaboradores(nome)"
    )
    .eq("profile_id", userId)
    .order("data", { ascending: false })
    .limit(50)
  return (data || []).map((mov: any) => {
    const ferramenta = Array.isArray(mov.ferramentas) ? mov.ferramentas[0] : mov.ferramentas
    const colaborador = Array.isArray(mov.colaboradores) ? mov.colaboradores[0] : mov.colaboradores
    return {
      id: mov.id,
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      observacoes: mov.observacoes,
      data: mov.data,
      created_at: mov.created_at,
      ferramentas: ferramenta
        ? { nome: ferramenta.nome, tipo_item: ferramenta.tipo_item }
        : null,
      colaboradores: colaborador ? { nome: colaborador.nome } : null,
    }
  })
}

async function getFerramentas(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("ferramentas")
    .select("id, nome, tipo_item, quantidade_disponivel")
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

export default async function MovimentacoesPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [movimentacoes, ferramentas, colaboradores] = await Promise.all([
    getMovimentacoes(user.id),
    getFerramentas(user.id),
    getColaboradores(user.id),
  ])

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900">
          Movimentações
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 mt-1.5">
          Registre entradas, saídas e devoluções de produtos
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <MovimentacoesList
          movimentacoes={movimentacoes}
          ferramentas={ferramentas}
          colaboradores={colaboradores}
        />
      </Suspense>
    </div>
  )
}
