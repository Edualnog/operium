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
    .select("id, nome, cargo, telefone, foto_url, data_admissao, email, cpf, endereco, observacoes, created_at")
    .eq("profile_id", userId)
    .order("nome", { ascending: true })
  return data || []
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
  
  const stats: Record<string, { retiradas: number; devolucoes: number; pendente: number }> = {}
  
  data.forEach((mov) => {
    if (!mov.colaborador_id) return
    
    const ferramenta = mov.ferramentas as any
    const eEPI = isEPI(ferramenta)
    
    if (!stats[mov.colaborador_id]) {
      stats[mov.colaborador_id] = { retiradas: 0, devolucoes: 0, pendente: 0 }
    }
    
    // CONTABILIZAR TODAS as retiradas e devoluções (incluindo EPIs)
    if (mov.tipo === "retirada") {
      stats[mov.colaborador_id].retiradas += mov.quantidade || 1
      console.log(`📥 Retirada contabilizada: ${ferramenta?.nome || 'desconhecido'} (EPI: ${eEPI}), qtd: ${mov.quantidade || 1}, total: ${stats[mov.colaborador_id].retiradas}`)
    } else if (mov.tipo === "devolucao") {
      stats[mov.colaborador_id].devolucoes += mov.quantidade || 1
      console.log(`📤 Devolução contabilizada: ${ferramenta?.nome || 'desconhecido'} (EPI: ${eEPI}), qtd: ${mov.quantidade || 1}, total: ${stats[mov.colaborador_id].devolucoes}`)
    }
  })
  
  // Calcular pendente APENAS para não-EPIs (para taxa de devolução)
  // Mas manter todas as retiradas/devoluções contabilizadas acima
  data.forEach((mov) => {
    if (!mov.colaborador_id) return
    
    const ferramenta = mov.ferramentas as any
    const eEPI = isEPI(ferramenta)
    
    // Se for EPI, não afeta o cálculo de pendente (taxa de devolução)
    if (eEPI) return
    
    // Para não-EPIs, calcular pendente normalmente
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
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [colaboradores, movimentacoesStats] = await Promise.all([
    getColaboradores(user.id),
    getMovimentacoesStats(user.id),
  ])

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900">Colaboradores</h1>
        <p className="text-sm sm:text-base text-zinc-600 mt-1.5">
          Gerencie os colaboradores do seu almoxarifado
        </p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <ColaboradoresList colaboradores={colaboradores} movimentacoesStats={movimentacoesStats} />
      </Suspense>
    </div>
  )
}

