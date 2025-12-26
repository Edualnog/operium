import { createServerComponentClient, getSupabaseUser } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import ColaboradoresList from "@/components/colaboradores/ColaboradoresList"
import { ListSkeleton } from "@/components/loading/PageSkeleton"
import { PageHeader } from "@/components/layout/PageHeader"

export const revalidate = 60 // Revalidar a cada 60 segundos

async function getColaboradores(userId: string) {
  const supabase = await createServerComponentClient()

  // First get the collaborators with new status fields
  const { data: colaboradores } = await supabase
    .from("colaboradores")
    .select("id, nome, cargo, telefone, foto_url, data_admissao, email, cpf, endereco, observacoes, created_at, almox_score, level, status, demitido_at, demitido_motivo")
    .eq("profile_id", userId)
    .order("nome", { ascending: true })

  if (!colaboradores) return []

  // Get operational profiles for all collaborators
  const { data: profiles } = await supabase
    .from("collaborator_operational_profile")
    .select("collaborator_id, role_function, seniority_bucket")
    .in("collaborator_id", colaboradores.map(c => c.id))

  // Get role history for all collaborators
  const { data: roleHistory } = await supabase
    .from("collaborator_role_history")
    .select("collaborator_id, role_function, promoted_at, notes")
    .in("collaborator_id", colaboradores.map(c => c.id))
    .order("promoted_at", { ascending: true })

  // Create maps for merging
  const profileMap = new Map(profiles?.map(p => [p.collaborator_id, p]) || [])
  const historyMap = new Map<string, any[]>()
  roleHistory?.forEach(h => {
    if (!historyMap.has(h.collaborator_id)) {
      historyMap.set(h.collaborator_id, [])
    }
    historyMap.get(h.collaborator_id)!.push(h)
  })

  return colaboradores.map(c => ({
    ...c,
    status: c.status || 'ATIVO',
    role_function: profileMap.get(c.id)?.role_function || null,
    seniority_bucket: profileMap.get(c.id)?.seniority_bucket || null,
    role_history: historyMap.get(c.id) || [],
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

async function getPendingToolsByColaborador(userId: string) {
  const supabase = await createServerComponentClient()

  // 1. Buscar todas as ferramentas com seu estado de estoque atual
  const { data: ferramentas } = await supabase
    .from("ferramentas")
    .select("id, nome, tipo_item, quantidade_total, quantidade_disponivel")
    .eq("profile_id", userId)
    .eq("tipo_item", "ferramenta") // Apenas ferramentas, não EPIs

  if (!ferramentas) return {}

  // Criar mapa de quanto está fora de cada ferramenta
  const estoqueForaMap: Record<string, { nome: string, fora: number }> = {}
  ferramentas.forEach(f => {
    const fora = f.quantidade_total - f.quantidade_disponivel
    if (fora > 0) {
      estoqueForaMap[f.id] = { nome: f.nome, fora }
    }
  })

  // Se não há ferramentas fora do estoque, retornar vazio
  if (Object.keys(estoqueForaMap).length === 0) return {}

  // 2. Buscar movimentações de retirada para atribuir a colaboradores
  // Ordenar por data DESC para priorizar retiradas mais recentes
  const { data: movimentacoes } = await supabase
    .from("movimentacoes")
    .select(`
      id,
      colaborador_id,
      ferramenta_id,
      tipo,
      quantidade,
      data
    `)
    .eq("profile_id", userId)
    .eq("tipo", "retirada")
    .not("colaborador_id", "is", null)
    .in("ferramenta_id", Object.keys(estoqueForaMap))
    .order("data", { ascending: false })

  if (!movimentacoes) return {}

  // 3. Distribuir as ferramentas fora do estoque aos colaboradores
  // Usando as retiradas mais recentes como base
  const pendingByColaborador: Record<string, any[]> = {}
  const quantidadeAtribuida: Record<string, number> = {} // Track quanto já foi atribuído por ferramenta

  for (const mov of movimentacoes) {
    const ferramentaId = mov.ferramenta_id
    const colaboradorId = mov.colaborador_id

    if (!ferramentaId || !colaboradorId) continue

    const ferramentaInfo = estoqueForaMap[ferramentaId]
    if (!ferramentaInfo) continue

    // Quanto ainda precisa ser atribuído dessa ferramenta
    const jaAtribuido = quantidadeAtribuida[ferramentaId] || 0
    const restante = ferramentaInfo.fora - jaAtribuido

    if (restante <= 0) continue // Já atribuímos tudo dessa ferramenta

    // Quanto atribuir dessa movimentação (min entre quantidade da mov e restante)
    const quantidadeMovimentacao = mov.quantidade || 1
    const quantidadeAtribuir = Math.min(quantidadeMovimentacao, restante)

    // Inicializar array do colaborador se não existe
    if (!pendingByColaborador[colaboradorId]) {
      pendingByColaborador[colaboradorId] = []
    }

    // Verificar se já existe essa ferramenta para esse colaborador
    const existente = pendingByColaborador[colaboradorId].find(
      (p: any) => p.item_id === ferramentaId
    )

    if (existente) {
      // Somar à quantidade existente (até o limite do que está fora)
      const novaQuantidade = Math.min(
        existente.quantity + quantidadeAtribuir,
        ferramentaInfo.fora - (quantidadeAtribuida[ferramentaId] || 0) + existente.quantity
      )
      existente.quantity = novaQuantidade
    } else {
      // Adicionar nova entrada
      pendingByColaborador[colaboradorId].push({
        movimentacao_id: mov.id,
        item_id: ferramentaId,
        item_name: ferramentaInfo.nome,
        quantity: quantidadeAtribuir,
        saida_at: mov.data
      })
    }

    // Atualizar quanto foi atribuído
    quantidadeAtribuida[ferramentaId] = jaAtribuido + quantidadeAtribuir
  }

  // Filtrar colaboradores sem ferramentas pendentes
  Object.keys(pendingByColaborador).forEach(colabId => {
    pendingByColaborador[colabId] = pendingByColaborador[colabId].filter(
      (p: any) => p.quantity > 0
    )
    if (pendingByColaborador[colabId].length === 0) {
      delete pendingByColaborador[colabId]
    }
  })

  return pendingByColaborador
}

// Get vehicles assigned to collaborators - both via team AND directly via current_driver_id
async function getVehiclesByColaborador(userId: string) {
  const supabase = await createServerComponentClient()

  const vehiclesByColaborador: Record<string, {
    team_id: string | null
    team_name: string | null
    vehicle_id: string
    vehicle_plate: string
    vehicle_model: string | null
    assignment_type: 'team' | 'direct'
  }> = {}

  // 1. Get vehicles directly assigned to collaborators via current_driver_id
  const { data: directVehicles } = await supabase
    .from("vehicles")
    .select(`
      id,
      plate,
      model,
      current_driver_id
    `)
    .eq("profile_id", userId)
    .not("current_driver_id", "is", null)

  directVehicles?.forEach((vehicle: any) => {
    if (vehicle.current_driver_id) {
      vehiclesByColaborador[vehicle.current_driver_id] = {
        team_id: null,
        team_name: null,
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate,
        vehicle_model: vehicle.model,
        assignment_type: 'direct'
      }
    }
  })

  // 2. Get vehicles assigned via team (for collaborators who don't have a direct assignment)
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select(`
      colaborador_id,
      teams (
        id,
        name,
        vehicle_id,
        vehicles (
          id,
          plate,
          model
        )
      )
    `)
    .is("left_at", null) // Only active members

  teamMembers?.forEach((member: any) => {
    const colaboradorId = member.colaborador_id
    const team = member.teams
    const vehicle = team?.vehicles

    // Only add if this collaborator doesn't already have a direct vehicle assignment
    if (colaboradorId && vehicle?.id && !vehiclesByColaborador[colaboradorId]) {
      vehiclesByColaborador[colaboradorId] = {
        team_id: team.id,
        team_name: team.name,
        vehicle_id: vehicle.id,
        vehicle_plate: vehicle.plate,
        vehicle_model: vehicle.model,
        assignment_type: 'team'
      }
    }
  })

  return vehiclesByColaborador
}

export default async function ColaboradoresPage() {
  const { user } = await getSupabaseUser()

  if (!user) {
    redirect("/login")
  }

  const [colaboradores, movimentacoesStats, pendingTools, vehiclesByColaborador] = await Promise.all([
    getColaboradores(user.id),
    getMovimentacoesStats(user.id),
    getPendingToolsByColaborador(user.id),
    getVehiclesByColaborador(user.id),
  ])

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        titleKey="dashboard.colaboradores.title"
        subtitleKey="dashboard.colaboradores.subtitle"
      />
      <Suspense fallback={<ListSkeleton />}>
        <ColaboradoresList
          colaboradores={colaboradores}
          movimentacoesStats={movimentacoesStats}
          pendingTools={pendingTools}
          vehiclesByColaborador={vehiclesByColaborador}
        />
      </Suspense>
    </div>
  )
}

