import { createServerComponentClient, getSupabaseUser } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import ColaboradoresList from "@/components/colaboradores/ColaboradoresList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"
import { PageHeader } from "@/components/layout/PageHeader"

export const revalidate = 60 // Revalidar a cada 60 segundos

async function getColaboradores(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("colaboradores")
    .select(`
      id, nome, cargo, telefone, foto_url, data_admissao, email, cpf, endereco, observacoes, created_at, almox_score, level,
      collaborator_operational_profile!collaborator_operational_profile_collaborator_id_fkey(role_function, seniority_bucket)
    `)
    .eq("profile_id", userId)
    .order("nome", { ascending: true })

  // Flatten the operational profile data
  return (data || []).map(c => ({
    ...c,
    role_function: c.collaborator_operational_profile?.[0]?.role_function || null,
    seniority_bucket: c.collaborator_operational_profile?.[0]?.seniority_bucket || null,
    collaborator_operational_profile: undefined
  }))
}

async function getMovimentacoesStats(userId: string) {
  const supabase = await createServerComponentClient()
  const { data } = await supabase
    .from("movimentacoes")
    .select("colaborador_id, tipo, quantidade, ferramentas(tipo_item, nome, categoria)")
    .eq("profile_id", userId)
    .in("tipo", ["retirada", "devolucao"])

  if (!data) return {}

  // Função auxiliar para verificar se é EPI
  const isEPI = (ferramenta: any): boolean => {
    if (!ferramenta) return false
    if (ferramenta.tipo_item === "epi") return true

    const nomeLower = (ferramenta.nome || "").toLowerCase()
    const categoriaLower = (ferramenta.categoria || "").toLowerCase()
    const palavrasEPI = [
      "capacete", "capacet", "óculos", "oculos", "protetor", "luvas", "luva",
      "máscara", "mascara", "respiratório", "respiratorio", "botas", "bota",
      "calçado", "calcado", "segurança", "seguranca", "epi", "cinto", "arnês", "arnes"
    ]

    return palavrasEPI.some(p => nomeLower.includes(p)) ||
      palavrasEPI.some(p => categoriaLower.includes(p)) ||
      categoriaLower === "epi"
  }

  const stats: Record<string, { retiradas: number; devolucoes: number; pendente: number; retiradasFerramenta: number; devolucoesFerramenta: number }> = {}

  data.forEach((mov) => {
    if (!mov.colaborador_id) return

    const ferramenta = mov.ferramentas as any
    const eEPI = isEPI(ferramenta)

    if (!stats[mov.colaborador_id]) {
      stats[mov.colaborador_id] = { retiradas: 0, devolucoes: 0, pendente: 0, retiradasFerramenta: 0, devolucoesFerramenta: 0 }
    }

    const isFerramenta = ferramenta?.tipo_item === "ferramenta"

    // CONTABILIZAR TODAS as retiradas e devoluções (para exibição geral)
    if (mov.tipo === "retirada") {
      stats[mov.colaborador_id].retiradas += mov.quantidade || 1
      console.log(`📥 Retirada contabilizada: ${ferramenta?.nome || 'desconhecido'} (Ferramenta: ${isFerramenta}), qtd: ${mov.quantidade || 1}, total: ${stats[mov.colaborador_id].retiradas}`)
    } else if (mov.tipo === "devolucao") {
      stats[mov.colaborador_id].devolucoes += mov.quantidade || 1
      console.log(`📤 Devolução contabilizada: ${ferramenta?.nome || 'desconhecido'} (Ferramenta: ${isFerramenta}), qtd: ${mov.quantidade || 1}, total: ${stats[mov.colaborador_id].devolucoes}`)
    }

    // Contagem separada apenas para ferramentas (taxa e pendente)
    if (isFerramenta) {
      if (mov.tipo === "retirada") {
        stats[mov.colaborador_id].retiradasFerramenta += mov.quantidade || 1
      } else if (mov.tipo === "devolucao") {
        stats[mov.colaborador_id].devolucoesFerramenta += mov.quantidade || 1
      }
    }
  })

  // Calcular pendente apenas para ferramentas (para taxa de devolução)
  data.forEach((mov) => {
    if (!mov.colaborador_id) return

    const ferramenta = mov.ferramentas as any
    const isFerramenta = ferramenta?.tipo_item === "ferramenta"

    // Só considerar ferramentas para pendente/taxa
    if (!isFerramenta) return

    // Para ferramentas, calcular pendente normalmente
    if (mov.tipo === "retirada") {
      stats[mov.colaborador_id].pendente += mov.quantidade
    } else if (mov.tipo === "devolucao") {
      stats[mov.colaborador_id].pendente -= mov.quantidade
    }
  })

  console.log("📊 Estatísticas finais por colaborador:", stats)
  return stats
}

export default async function ColaboradoresPage() {
  const { user } = await getSupabaseUser()

  if (!user) {
    redirect("/login")
  }

  const [colaboradores, movimentacoesStats] = await Promise.all([
    getColaboradores(user.id),
    getMovimentacoesStats(user.id),
  ])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        titleKey="dashboard.colaboradores.title"
        subtitleKey="dashboard.colaboradores.subtitle"
      />
      <Suspense fallback={<ListSkeleton />}>
        <ColaboradoresList colaboradores={colaboradores} movimentacoesStats={movimentacoesStats} />
      </Suspense>
    </div>
  )
}
