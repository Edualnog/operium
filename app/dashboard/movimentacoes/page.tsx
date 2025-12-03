import { createServerComponentClient, getSupabaseUser } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import MovimentacoesList from "@/components/movimentacoes/MovimentacoesList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"

// Removido revalidate para permitir atualização imediata após registrar movimentações

async function getMovimentacoes(userId: string) {
  try {
    const supabase = await createServerComponentClient()
    const { data, error } = await supabase
      .from("movimentacoes")
      .select(
        "id, tipo, quantidade, observacoes, data, ferramentas(nome, tipo_item), colaboradores(nome)"
      )
      .eq("profile_id", userId)
      .order("data", { ascending: false, nullsFirst: false })
      .limit(100)

    if (error) {
      console.error("❌ Erro ao buscar movimentações:", error)
      return []
    }

    console.log("📋 Movimentações encontradas no banco:", data?.length || 0)

    const result = (data || []).map((mov: any) => {
      const ferramenta = Array.isArray(mov.ferramentas) ? mov.ferramentas[0] : mov.ferramentas
      const colaborador = Array.isArray(mov.colaboradores) ? mov.colaboradores[0] : mov.colaboradores
      return {
        id: mov.id,
        tipo: mov.tipo,
        quantidade: mov.quantidade,
        observacoes: mov.observacoes,
        data: mov.data,
        ferramentas: ferramenta
          ? { nome: ferramenta.nome, tipo_item: ferramenta.tipo_item }
          : null,
        colaboradores: colaborador ? { nome: colaborador.nome } : null,
      }
    })

    console.log("✅ Movimentações processadas:", result.length)
    return result
  } catch (error: any) {
    console.error("Erro ao buscar movimentações:", error)
    return []
  }
}

async function getFerramentas(userId: string) {
  try {
    const supabase = await createServerComponentClient()
    const { data, error } = await supabase
      .from("ferramentas")
      .select("id, nome, tipo_item, quantidade_disponivel")
      .eq("profile_id", userId)
      .order("nome", { ascending: true })

    if (error) {
      console.error("Erro ao buscar ferramentas:", error)
      return []
    }

    return data || []
  } catch (error: any) {
    console.error("Erro ao buscar ferramentas:", error)
    return []
  }
}

async function getColaboradores(userId: string) {
  try {
    const supabase = await createServerComponentClient()
    const { data, error } = await supabase
      .from("colaboradores")
      .select("id, nome")
      .eq("profile_id", userId)
      .order("nome", { ascending: true })

    if (error) {
      console.error("Erro ao buscar colaboradores:", error)
      return []
    }

    return data || []
  } catch (error: any) {
    console.error("Erro ao buscar colaboradores:", error)
    return []
  }
}

export default async function MovimentacoesPage() {
  const { user } = await getSupabaseUser()

  if (!user) {
    redirect("/login")
  }

  let movimentacoes: any[] = []
  let ferramentas: any[] = []
  let colaboradores: any[] = []

  try {
    ;[movimentacoes, ferramentas, colaboradores] = await Promise.all([
      getMovimentacoes(user.id),
      getFerramentas(user.id),
      getColaboradores(user.id),
    ])
  } catch (error: any) {
    console.error("Erro ao carregar dados da página de movimentações:", error)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Movimentações
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 mt-1.5 dark:text-zinc-400">
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
