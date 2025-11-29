"use client"

import { useState, useEffect } from "react"
import { useKPIs } from "@/lib/hooks/useKPIs"
import { createClientComponentClient } from "@/lib/supabase-client"
import { KPICard } from "./KPICard"
import { KpiList } from "./KpiList"
import { KpiChart } from "./KpiChart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Wrench,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  Shield,
  Calendar,
  AlertCircle,
  Target,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Activity,
} from "lucide-react"

interface IndustrialDashboardProps {
  userId: string
}

export default function IndustrialDashboard({ userId }: IndustrialDashboardProps) {
  const { data, loading, error } = useKPIs(userId)
  const [rankingView, setRankingView] = useState<"melhores" | "piores">("melhores")
  const [periodoConsumo, setPeriodoConsumo] = useState<7 | 14 | 30 | 60 | 120>(30)
  const [consumoPorPeriodo, setConsumoPorPeriodo] = useState<any[]>([])
  const [loadingConsumo, setLoadingConsumo] = useState(false)
  const [itensComprarUrgente, setItensComprarUrgente] = useState<any[]>([])
  const [loadingItensUrgente, setLoadingItensUrgente] = useState(false)
  const [periodoFerramentas, setPeriodoFerramentas] = useState<7 | 14 | 30 | 60 | 120>(30)
  const [ferramentasPorPeriodo, setFerramentasPorPeriodo] = useState<any[]>([])
  const [loadingFerramentas, setLoadingFerramentas] = useState(false)
  const [movimentacoesMensais, setMovimentacoesMensais] = useState<any[]>([])
  const [loadingMovMensais, setLoadingMovMensais] = useState(false)
  const [statusFerramentas, setStatusFerramentas] = useState({ disponiveis: 0, emUso: 0, manutencao: 0 })

  // Buscar dados de consumo baseado no período selecionado
  useEffect(() => {
    async function fetchConsumoPorPeriodo() {
      if (!userId) return
      
      setLoadingConsumo(true)
      try {
        const supabase = createClientComponentClient()
        const dataInicio = new Date()
        dataInicio.setDate(dataInicio.getDate() - periodoConsumo)

        const { data: movimentacoes, error: movError } = await supabase
          .from("movimentacoes")
          .select("ferramenta_id, quantidade, data, ferramentas(tipo_item, nome, categoria)")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", dataInicio.toISOString())

        if (movError) {
          console.error("Erro ao buscar movimentações:", movError)
          setLoadingConsumo(false)
          return
        }

        // Calcular consumo por item (apenas consumíveis)
        const consumoPorItem: Record<string, any> = {}
        movimentacoes?.forEach((mov: any) => {
          const ferramenta = mov.ferramentas as any
          // Filtrar apenas consumíveis
          if (ferramenta?.tipo_item !== "consumivel") return
          
          const id = mov.ferramenta_id
          if (!consumoPorItem[id]) {
            consumoPorItem[id] = {
              id,
              nome: ferramenta?.nome || "Desconhecido",
              consumo: 0,
              categoria: ferramenta?.categoria,
            }
          }
          consumoPorItem[id].consumo += mov.quantidade || 0
        })

        const itensConsumo = Object.values(consumoPorItem)
          .map((item: any) => ({
            ...item,
            consumo_medio_diario: item.consumo / periodoConsumo,
          }))
          .sort((a: any, b: any) => b.consumo - a.consumo)
          .slice(0, 10)

        setConsumoPorPeriodo(itensConsumo)
      } catch (err) {
        console.error("Erro ao calcular consumo:", err)
      } finally {
        setLoadingConsumo(false)
      }
    }

    fetchConsumoPorPeriodo()
  }, [userId, periodoConsumo])

  // Buscar itens para comprar urgente (baseado em demanda)
  useEffect(() => {
    async function fetchItensComprarUrgente() {
      if (!userId) return
      
      setLoadingItensUrgente(true)
      try {
        const supabase = createClientComponentClient()
        const trintaDiasAtras = new Date()
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

        // Buscar consumíveis e suas movimentações
        const [ferramentasRes, movimentacoesRes] = await Promise.all([
          supabase
            .from("ferramentas")
            .select("id, nome, quantidade_disponivel, ponto_ressuprimento, categoria, lead_time_dias")
            .eq("profile_id", userId)
            .eq("tipo_item", "consumivel"),
          supabase
            .from("movimentacoes")
            .select("ferramenta_id, quantidade")
            .eq("profile_id", userId)
            .eq("tipo", "retirada")
            .gte("data", trintaDiasAtras.toISOString()),
        ])

        if (ferramentasRes.error || movimentacoesRes.error) {
          console.error("Erro ao buscar dados:", ferramentasRes.error || movimentacoesRes.error)
          setLoadingItensUrgente(false)
          return
        }

        const ferramentas = ferramentasRes.data || []
        const movimentacoes = movimentacoesRes.data || []

        // Calcular demanda (total de retiradas) por item
        const demandaPorItem: Record<string, number> = {}
        movimentacoes.forEach((mov: any) => {
          demandaPorItem[mov.ferramenta_id] = (demandaPorItem[mov.ferramenta_id] || 0) + (mov.quantidade || 0)
        })

        // Criar lista de itens com prioridade considerando consumo médio e cobertura vs lead time
        const itensComPrioridade = ferramentas
          .map((f: any) => {
            const demanda = demandaPorItem[f.id] || 0
            const consumoMedioDiario = demanda / 30
            const estoqueAtual = f.quantidade_disponivel || 0
            const pontoRessuprimento = f.ponto_ressuprimento || 0
            const leadTime = f.lead_time_dias || 7

            const diasCobertura = consumoMedioDiario > 0 ? estoqueAtual / consumoMedioDiario : Infinity
            const urgenciaBase = Number.isFinite(diasCobertura)
              ? diasCobertura - leadTime
              : 9999

            const abaixoMinimo = pontoRessuprimento > 0 && estoqueAtual <= pontoRessuprimento
            // Ajuste: itens abaixo do mínimo sobem na lista
            const prioridadeScore = urgenciaBase - (abaixoMinimo ? 30 : 0)

            return {
              id: f.id,
              nome: f.nome,
              quantidade_disponivel: estoqueAtual,
              ponto_ressuprimento: pontoRessuprimento,
              categoria: f.categoria,
              demanda,
              consumo_medio_diario: consumoMedioDiario,
              dias_cobertura: Number.isFinite(diasCobertura) ? diasCobertura : null,
              lead_time: leadTime,
              abaixo_minimo: abaixoMinimo,
              prioridade_score: prioridadeScore,
            }
          })
          // Itens com consumo ou já abaixo do mínimo
          .filter((item: any) => item.demanda > 0 || item.abaixo_minimo)
          .sort((a: any, b: any) => {
            // 1) abaixo do mínimo primeiro
            if (a.abaixo_minimo !== b.abaixo_minimo) return a.abaixo_minimo ? -1 : 1
            // 2) menor cobertura vs lead time (prioridade_score menor = mais urgente)
            if (a.prioridade_score !== b.prioridade_score) return a.prioridade_score - b.prioridade_score
            // 3) maior consumo médio para desempate
            return (b.consumo_medio_diario || 0) - (a.consumo_medio_diario || 0)
          })
          .slice(0, 3) // Máximo 3 itens

        setItensComprarUrgente(itensComPrioridade)
      } catch (err) {
        console.error("Erro ao buscar itens urgentes:", err)
      } finally {
        setLoadingItensUrgente(false)
      }
    }

    fetchItensComprarUrgente()
  }, [userId, data])

  // Buscar ferramentas mais utilizadas baseado no período selecionado
  useEffect(() => {
    async function fetchFerramentasPorPeriodo() {
      if (!userId) return
      
      setLoadingFerramentas(true)
      try {
        const supabase = createClientComponentClient()
        const dataInicio = new Date()
        dataInicio.setDate(dataInicio.getDate() - periodoFerramentas)

        const { data: movimentacoes, error: movError } = await supabase
          .from("movimentacoes")
          .select("ferramenta_id, quantidade, data, ferramentas(nome, categoria, tipo_item)")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", dataInicio.toISOString())

        if (movError) {
          console.error("Erro ao buscar movimentações de ferramentas:", movError)
          setLoadingFerramentas(false)
          return
        }

        // Calcular saídas por ferramenta
        const saidasPorFerramenta: Record<string, any> = {}
        movimentacoes?.forEach((mov: any) => {
          const ferramenta = mov.ferramentas as any
          // Filtrar apenas ferramentas (não consumíveis)
          if (ferramenta?.tipo_item === "consumivel") return
          
          const id = mov.ferramenta_id
          if (!saidasPorFerramenta[id]) {
            saidasPorFerramenta[id] = {
              id,
              nome: ferramenta?.nome || "Desconhecido",
              total_saidas: 0,
              categoria: ferramenta?.categoria || "-",
            }
          }
          saidasPorFerramenta[id].total_saidas += mov.quantidade || 0
        })

        const ferramentasUtilizadas = Object.values(saidasPorFerramenta)
          .sort((a: any, b: any) => b.total_saidas - a.total_saidas)
          .slice(0, 3) // Máximo 3 itens

        setFerramentasPorPeriodo(ferramentasUtilizadas)
      } catch (err) {
        console.error("Erro ao calcular ferramentas utilizadas:", err)
      } finally {
        setLoadingFerramentas(false)
      }
    }

    fetchFerramentasPorPeriodo()
  }, [userId, periodoFerramentas])

  // Buscar movimentações mensais para o gráfico de overview
  useEffect(() => {
    async function fetchMovimentacoesMensais() {
      if (!userId) return
      
      setLoadingMovMensais(true)
      try {
        const supabase = createClientComponentClient()
        const dozeMesesAtras = new Date()
        dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12)

        const { data: movimentacoes, error: movError } = await supabase
          .from("movimentacoes")
          .select("data, tipo")
          .eq("profile_id", userId)
          .or(`data.gte.${dozeMesesAtras.toISOString()},data.is.null`)

        if (movError) {
          console.error("Erro ao buscar movimentações mensais:", movError)
          setLoadingMovMensais(false)
          return
        }

        // Agrupar por mês/ano e tipo (evita colidir nomes de meses de anos diferentes)
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const mapaMes: Record<string, { entradas: number; saidas: number; total: number; label: string }> = {}

        movimentacoes?.forEach((mov: any) => {
          const dataRef = mov.data ? new Date(mov.data) : new Date()
          // Filtrar manualmente os últimos 12 meses para dados sem data
          if (dataRef < dozeMesesAtras) return
          const date = dataRef
          const key = `${date.getFullYear()}-${date.getMonth()}`
          if (!mapaMes[key]) {
            mapaMes[key] = {
              entradas: 0,
              saidas: 0,
              total: 0,
              label: `${meses[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`,
            }
          }

          mapaMes[key].total += 1

          // Contagem por tipo
          if (mov.tipo === 'entrada' || mov.tipo === 'devolucao') {
            mapaMes[key].entradas += 1
          } else if (['retirada', 'ajuste', 'conserto'].includes(mov.tipo)) {
            mapaMes[key].saidas += 1
          }
        })

        // Criar array com últimos 12 meses (ordem cronológica)
        const resultado: any[] = []
        const hoje = new Date()
        for (let i = 11; i >= 0; i--) {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${d.getMonth()}`
          const dadosMes = mapaMes[key] || { entradas: 0, saidas: 0, total: 0, label: `${meses[d.getMonth()]}` }
          resultado.push({
            mes: dadosMes.label,
            entradas: dadosMes.entradas,
            saidas: dadosMes.saidas,
            total: dadosMes.total,
          })
        }

        setMovimentacoesMensais(resultado)
        
        // Debug: Log para verificar os dados
        console.log('📊 Movimentações Mensais:', {
          totalMovimentacoes: movimentacoes?.length || 0,
          ultimosMeses: resultado.slice(-3),
          primeirosMeses: resultado.slice(0, 3),
          todosOsMeses: resultado
        })
      } catch (err) {
        console.error("Erro ao calcular movimentações mensais:", err)
      } finally {
        setLoadingMovMensais(false)
      }
    }

    fetchMovimentacoesMensais()
  }, [userId])

  // Calcular status das ferramentas
  useEffect(() => {
    async function calcularStatus() {
      if (!userId) return
      
      try {
        const supabase = createClientComponentClient()
        
        // Buscar todas as ferramentas
        const { data: ferramentas, error: ferrError } = await supabase
          .from("ferramentas")
          .select("id, quantidade_disponivel, quantidade_total, estado")
          .eq("profile_id", userId)
          .eq("tipo_item", "ferramenta")

        if (ferrError) {
          console.error("Erro ao buscar ferramentas:", ferrError)
          return
        }

        // Buscar consertos ativos (não concluídos) para calcular unidades em conserto
        const { data: consertosAtivos } = await supabase
          .from("consertos")
          .select("id, ferramenta_id, data_envio")
          .eq("profile_id", userId)
          .neq("status", "concluido")

        // Calcular unidades em conserto por ferramenta (descontando as que já retornaram)
        const unidadesEmConserto: Record<string, number> = {}
        
        if (consertosAtivos && consertosAtivos.length > 0) {
          for (const conserto of consertosAtivos) {
            const dataEnvioRef = conserto.data_envio || new Date().toISOString()

            // 1) Tenta pegar a movimentação de envio vinculada pelo ID na observação
            const { data: movEnvioPorObs } = await supabase
              .from("movimentacoes")
              .select("quantidade, data")
              .eq("profile_id", userId)
              .eq("ferramenta_id", conserto.ferramenta_id)
              .eq("tipo", "conserto")
              .ilike("observacoes", `%${conserto.id}%`)
              .order("data", { ascending: true })
              .limit(1)

            let movEnvio = movEnvioPorObs?.[0]

            // 2) Fallback: primeiro envio registrado depois da data do conserto
            if (!movEnvio) {
              const { data: movEnvioFallback } = await supabase
                .from("movimentacoes")
                .select("quantidade, data")
                .eq("profile_id", userId)
                .eq("ferramenta_id", conserto.ferramenta_id)
                .eq("tipo", "conserto")
                .gte("data", dataEnvioRef)
                .order("data", { ascending: true })
                .limit(1)
              movEnvio = movEnvioFallback?.[0]
            }

            const quantidadeEnviada = movEnvio?.quantidade || 1

            // 3) Retornos vinculados a este conserto (observação com ID)
            const { data: movRetornos } = await supabase
              .from("movimentacoes")
              .select("quantidade")
              .eq("profile_id", userId)
              .eq("ferramenta_id", conserto.ferramenta_id)
              .eq("tipo", "entrada")
              .ilike("observacoes", `%${conserto.id}%`)

            let quantidadeJaRetornada = (movRetornos || []).reduce(
              (acc: number, m: any) => acc + (m.quantidade || 0),
              0
            )

            // Fallback para dados antigos sem observação: considerar entradas após a data do conserto
            if (quantidadeJaRetornada === 0) {
              const { data: movRetornosFallback } = await supabase
                .from("movimentacoes")
                .select("quantidade")
                .eq("profile_id", userId)
                .eq("ferramenta_id", conserto.ferramenta_id)
                .eq("tipo", "entrada")
                .gte("data", dataEnvioRef)

              quantidadeJaRetornada = (movRetornosFallback || []).reduce(
                (acc: number, m: any) => acc + (m.quantidade || 0),
                0
              )
            }

            const quantidadeAindaEmConserto = quantidadeEnviada - quantidadeJaRetornada
            
            if (quantidadeAindaEmConserto > 0) {
              unidadesEmConserto[conserto.ferramenta_id] = 
                (unidadesEmConserto[conserto.ferramenta_id] || 0) + quantidadeAindaEmConserto
            }
          }
        }

        // Contar status por UNIDADE (não por item)
        // Cada unidade deve ser contada apenas uma vez
        let totalDisponiveis = 0
        let totalEmUso = 0
        let totalManutencao = 0
        let totalUnidades = 0

        ferramentas?.forEach((f: any) => {
          const qtdTotal = f.quantidade_total || 0
          const qtdDisponivel = f.quantidade_disponivel || 0
          const qtdEmConserto = unidadesEmConserto[f.id] || 0
          
          totalUnidades += qtdTotal
          
          // Unidades danificadas (estado = "danificada") - toda a quantidade vai para manutenção
          if (f.estado === "danificada") {
            totalManutencao += qtdTotal
            // Não contar como disponível nem em uso
          } else {
            // Unidades em conserto
            totalManutencao += qtdEmConserto
            
            // O restante: quantidade_total - quantidade_disponivel - qtdEmConserto = em uso
            // quantidade_disponivel já descontou as que estão em conserto
            const qtdRealEmUso = qtdTotal - qtdDisponivel - qtdEmConserto
            
            totalDisponiveis += qtdDisponivel
            totalEmUso += Math.max(0, qtdRealEmUso) // Não pode ser negativo
          }
        })

        if (totalUnidades > 0) {
          setStatusFerramentas({
            disponiveis: Math.round((totalDisponiveis / totalUnidades) * 100),
            emUso: Math.round((totalEmUso / totalUnidades) * 100),
            manutencao: Math.round((totalManutencao / totalUnidades) * 100),
          })
        } else {
          setStatusFerramentas({
            disponiveis: 0,
            emUso: 0,
            manutencao: 0,
          })
        }
      } catch (err) {
        console.error("Erro ao calcular status:", err)
      }
    }

    calcularStatus()
  }, [userId, data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">Erro ao carregar KPIs: {error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
        <p className="text-sm text-zinc-600">Nenhum dado disponível</p>
      </div>
    )
  }

  const totalEmUsoUnidades = data.totalFerramentasEmUso ?? data.ferramentasEmUso.reduce(
    (acc, item) => acc + (item.quantidade_em_uso || 0),
    0
  )

  const totalEstragadasUnidades = data.totalFerramentasEstragadas ??
    (data.ferramentasEstragadas || []).reduce(
      (acc, item) => acc + (item.quantidade_unidades || 0),
      0
    )

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900">
          Almox Fácil
        </h1>
        <p className="text-sm sm:text-base text-zinc-600 mt-1.5">
          Mais agilidade e controle nas operações do almoxarifado
        </p>
      </div>

      {/* SESSÃO OVERVIEW - Gráficos principais */}
      <section className="space-y-6 mb-8">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {/* Gráfico de Movimentações */}
          <Card className="lg:col-span-2 border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-zinc-600" />
                    Movimentações
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                    Últimos 12 meses • Passe o mouse sobre as barras para detalhes
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-700 font-medium">Entradas</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs text-rose-700 font-medium">Saídas</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingMovMensais ? (
                <div className="flex items-center justify-center h-48">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
                    <p className="text-sm text-zinc-500">Carregando dados...</p>
                  </div>
                </div>
              ) : movimentacoesMensais.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Nenhuma movimentação nos últimos 12 meses</p>
                    <p className="text-xs text-zinc-400 mt-1">Comece registrando entradas e saídas de itens</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Linha de base e grid */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: '12rem' }}>
                    <div className="w-full h-px bg-zinc-100"></div>
                    <div className="w-full h-px bg-zinc-100"></div>
                    <div className="w-full h-px bg-zinc-100"></div>
                    <div className="w-full h-px bg-zinc-200 border-t border-zinc-300"></div>
                  </div>
                  
                  <div className="h-48 flex items-end gap-1 sm:gap-2 relative z-10">
                  {movimentacoesMensais.map((item, index) => {
                    const maxValue = Math.max(
                      ...movimentacoesMensais.map(m => Math.max(m.entradas, m.saidas)),
                      1
                    )
                    const heightEntradas = (item.entradas / maxValue) * 100
                    const heightSaidas = (item.saidas / maxValue) * 100
                    const totalMovimentacoes = item.entradas + item.saidas
                    const temDados = totalMovimentacoes > 0
                    
                    return (
                      <div 
                        key={index} 
                        className="flex-1 flex flex-col items-center gap-1 h-full group relative animate-in fade-in slide-in-from-bottom-4"
                        style={{ animationDelay: `${index * 50}ms`, animationDuration: '500ms', animationFillMode: 'backwards' }}
                      >
                        {/* Tooltip */}
                        {temDados && (
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                            <div className="bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                              <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1.5">{item.mes}</div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>Entradas: <strong>{item.entradas}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                                  <span>Saídas: <strong>{item.saidas}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 pt-1 mt-1 border-t border-zinc-700">
                                  <span>Total: <strong>{totalMovimentacoes}</strong></span>
                                </div>
                              </div>
                              {/* Seta do tooltip */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-900" />
                            </div>
                          </div>
                        )}
                        
                        <div className="w-full flex flex-col-reverse gap-0.5 justify-end transition-all duration-300" style={{ height: '12rem' }}>
                          {/* Indicador de "sem dados" */}
                          {!temDados && (
                            <div className="w-full h-1 bg-zinc-100 rounded-full opacity-50" />
                          )}
                          
                          {/* Barra de Saídas (vermelho) */}
                          <div 
                            className={`w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-sm transition-all duration-300 hover:from-rose-600 hover:to-rose-500 hover:shadow-lg hover:scale-105 ${
                              item.saidas === 0 ? 'opacity-0' : 'opacity-100'
                            }`}
                            style={{ height: `${heightSaidas}%` }}
                          />
                          {/* Barra de Entradas (verde) */}
                          <div 
                            className={`w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm transition-all duration-300 hover:from-emerald-600 hover:to-emerald-500 hover:shadow-lg hover:scale-105 ${
                              item.entradas === 0 ? 'opacity-0' : 'opacity-100'
                            }`}
                            style={{ height: `${heightEntradas}%` }}
                          />
                        </div>
                        <span className={`text-[10px] sm:text-xs transition-colors ${temDados ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>
                          {item.mes}
                        </span>
                      </div>
                    )
                  })}
                </div>
                </div>
              )}
              
              {/* Estatísticas do período */}
              {!loadingMovMensais && movimentacoesMensais.length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-1">Total Movimentações</p>
                      <p className="text-lg font-bold text-zinc-900">
                        {movimentacoesMensais.reduce((acc, m) => acc + m.total, 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-1">Total Entradas</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {movimentacoesMensais.reduce((acc, m) => acc + m.entradas, 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-1">Total Saídas</p>
                      <p className="text-lg font-bold text-rose-600">
                        {movimentacoesMensais.reduce((acc, m) => acc + m.saidas, 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500 mb-1">Média Mensal</p>
                      <p className="text-lg font-bold text-blue-600">
                        {Math.round(movimentacoesMensais.reduce((acc, m) => acc + m.total, 0) / 12)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status das Ferramentas */}
          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900">
                Status
              </CardTitle>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                Situação das ferramentas
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Disponível */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-600">Disponível</span>
                  <span className="text-zinc-900 font-semibold">{statusFerramentas.disponiveis}%</span>
                </div>
                <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${statusFerramentas.disponiveis}%` }}
                  />
                </div>
              </div>

              {/* Em uso */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-600">Em uso</span>
                  <span className="text-zinc-900 font-semibold">{statusFerramentas.emUso}%</span>
                </div>
                <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${statusFerramentas.emUso}%` }}
                  />
                </div>
              </div>

              {/* Manutenção */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-600">Manutenção</span>
                  <span className="text-zinc-900 font-semibold">{statusFerramentas.manutencao}%</span>
                </div>
                <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${statusFerramentas.manutencao}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de estatísticas rápidas */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Itens em Estoque</p>
                  <p className="text-xl font-bold text-zinc-900">
                    {data.totais?.itensEstoque || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Colaboradores</p>
                  <p className="text-xl font-bold text-zinc-900">
                    {data.totais?.colaboradores || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Wrench className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Ferramentas</p>
                  <p className="text-xl font-bold text-zinc-900">
                    {data.totais?.ferramentas || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Movimentações/mês</p>
                  <p className="text-xl font-bold text-zinc-900">
                    {(() => {
                      // Pegar o mês atual
                      const hoje = new Date()
                      const mesAtual = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][hoje.getMonth()]
                      const mesAtualData = movimentacoesMensais.find(m => m.mes === mesAtual)
                      return mesAtualData?.total || 0
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SESSÃO 1: FERRAMENTAS */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="h-5 w-5 text-zinc-700" />
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Ferramentas
          </h2>
        </div>

        {/* KPIs Principais - Ferramentas */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            title="Ferramentas em Uso Agora"
            value={totalEmUsoUnidades}
            description="Unidades atualmente emprestadas"
            iconName="Activity"
          />
          <KPICard
            title="Ferramentas Estragadas"
            value={totalEstragadasUnidades}
            description="Em manutenção ou danificadas"
            iconName="AlertTriangle"
            variant={(totalEstragadasUnidades || 0) > 0 ? "destructive" : "default"}
          />
          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-zinc-700" />
                <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900">
                  Itens para reposição urgente
                </CardTitle>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                Baseado na demanda interna (mais retirados = maior prioridade)
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingItensUrgente ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-zinc-500">Carregando...</p>
                </div>
              ) : itensComprarUrgente.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">
                  Nenhum item urgente encontrado
                </p>
              ) : (
                <div className="space-y-3">
                  {itensComprarUrgente.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={index === 0 ? "destructive" : index === 1 ? "default" : "secondary"}
                            className="text-xs font-semibold"
                          >
                            #{index + 1}
                          </Badge>
                          <h4 className="text-sm font-semibold text-zinc-900 truncate">
                            {item.nome}
                          </h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-zinc-500">Demanda:</span>
                            <Badge variant="outline" className="font-semibold text-xs">
                              {item.demanda} retiradas
                            </Badge>
                          </div>
                          {item.ponto_ressuprimento > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500">Estoque:</span>
                              <span className={`text-xs font-medium ${
                                item.quantidade_disponivel <= item.ponto_ressuprimento 
                                  ? "text-red-600" 
                                  : "text-zinc-700"
                              }`}>
                                {item.quantidade_disponivel} / Mín: {item.ponto_ressuprimento}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rankings - Ferramentas */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900">
                    Top Ferramentas Mais Utilizadas
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                    {loadingFerramentas ? "Carregando..." : `Últimos ${periodoFerramentas} dias`}
                  </p>
                </div>
                <div className="flex gap-1 border rounded-md p-1 bg-background">
                  {([7, 14, 30, 60, 120] as const).map((dias) => (
                    <Button
                      key={dias}
                      type="button"
                      variant={periodoFerramentas === dias ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPeriodoFerramentas(dias)}
                      className="h-7 px-2 text-xs"
                      disabled={loadingFerramentas}
                    >
                      {dias}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingFerramentas ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-zinc-500">Carregando dados...</p>
                </div>
              ) : (() => {
                const itemsFonte = ferramentasPorPeriodo.length > 0 
                  ? ferramentasPorPeriodo 
                  : data.topFerramentasUtilizadas.slice(0, 3)
                
                if (itemsFonte.length === 0) {
                  return (
                    <p className="text-sm text-zinc-500 text-center py-8">
                      Nenhuma ferramenta encontrada
                    </p>
                  )
                }
                
                return (
                  <div className="space-y-2">
                    {itemsFonte.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-400">
                              #{index + 1}
                            </span>
                            <h4 className="text-sm font-semibold text-zinc-900 truncate">
                              {item.nome}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500">Saídas:</span>
                              <Badge variant="outline" className="font-semibold text-xs">
                    {item.total_saidas}
                  </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500">Categoria:</span>
                              <span className="text-xs font-medium text-zinc-700">
                                {item.categoria || "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900">
                    Ranking de Responsabilidade
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                    Score baseado em devoluções no prazo
                  </p>
                </div>
                <div className="flex gap-1 border rounded-md p-1 bg-background">
                  <Button
                    type="button"
                    variant={rankingView === "melhores" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setRankingView("melhores")}
                    className="h-7 px-3 text-xs"
                  >
                    <ArrowUp className="h-3 w-3 mr-1" />
                    Melhores
                  </Button>
                  <Button
                    type="button"
                    variant={rankingView === "piores" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setRankingView("piores")}
                    className="h-7 px-3 text-xs"
                  >
                    <ArrowDown className="h-3 w-3 mr-1" />
                    Piores
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const rankingItems = data.rankingResponsabilidade.map((item) => ({
              ...item,
              id: item.colaborador_id || item.nome,
                }))
                
                // Ordenar e pegar os melhores ou piores
                const sortedItems = [...rankingItems].sort((a, b) => {
                  if (rankingView === "melhores") {
                    return b.score - a.score // Maior score primeiro
                  } else {
                    return a.score - b.score // Menor score primeiro
                  }
                })
                
                const displayItems = sortedItems.slice(0, 3)
                
                if (displayItems.length === 0) {
                  return (
                    <p className="text-sm text-zinc-500 text-center py-8">
                      Nenhum colaborador encontrado
                    </p>
                  )
                }
                
                return (
                  <div className="space-y-2">
                    {displayItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg border border-zinc-100 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-400">
                              #{index + 1}
                            </span>
                            <h4 className="text-sm font-semibold text-zinc-900 truncate">
                              {item.nome}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500">Score:</span>
                  <Badge
                    variant={item.score >= 80 ? "default" : item.score >= 60 ? "secondary" : "destructive"}
                                className="font-semibold text-xs"
                  >
                    {item.score.toFixed(0)}%
                  </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500">Retiradas:</span>
                              <span className="text-xs font-medium text-zinc-700">
                                {item.total_retiradas || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-500">No Prazo:</span>
                              <span className="text-xs font-medium text-zinc-700">
                                {item.devolucoes_no_prazo || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Ferramentas em Uso */}
        {data.ferramentasEmUso.length > 0 && (
          <KpiList
            title="Ferramentas Atualmente em Uso"
            description="Detalhamento das ferramentas emprestadas"
            items={data.ferramentasEmUso}
            columns={[
              {
                key: "colaborador",
                label: "Colaborador",
              },
              {
                key: "quantidade_em_uso",
                label: "Qtde",
                render: (item) => item.quantidade_em_uso || 0,
              },
              {
                key: "dias_em_uso",
                label: "Dias em Uso",
                render: (item) => `${item.dias_em_uso} dias`,
              },
              {
                key: "prazo_devolucao",
                label: "Prazo",
                render: (item) =>
                  item.prazo_devolucao
                    ? formatDistanceToNow(new Date(item.prazo_devolucao), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : "Sem prazo",
              },
            ]}
            maxItems={5}
            showViewMore={true}
            viewMoreLink="/dashboard/movimentacoes"
          />
        )}
      </section>

      {/* SESSÃO 2: CONSUMÍVEIS */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="h-5 w-5 text-zinc-700" />
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Consumíveis
          </h2>
        </div>

        <Card className="border border-zinc-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900">
                  Top consumíveis mais retirados
                </CardTitle>
                <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                  {loadingConsumo ? "Carregando..." : `Últimos ${periodoConsumo} dias`}
                </p>
              </div>
              <div className="flex gap-1 border rounded-md p-1 bg-background">
                {([7, 14, 30, 60, 120] as const).map((dias) => (
                  <Button
                    key={dias}
                    type="button"
                    variant={periodoConsumo === dias ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPeriodoConsumo(dias)}
                    className="h-7 px-2 text-xs"
                    disabled={loadingConsumo}
                  >
                    {dias}d
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingConsumo ? (
              <div className="flex items-center justify-center h-[320px]">
                <p className="text-sm text-zinc-500">Carregando dados...</p>
              </div>
            ) : (
        <KpiChart
                title=""
                description=""
                data={(() => {
                  // Usar dados do período selecionado ou fallback para dados padrão
                  const dadosFonte = consumoPorPeriodo.length > 0 
                    ? consumoPorPeriodo.map(item => ({
                        nome: item.nome || "",
                        consumo_30d: item.consumo || 0,
                        id: item.id,
                      }))
                    : data.itensMaiorConsumo.map(item => ({
                        nome: item.nome || "",
                        consumo_30d: item.consumo_30d || 0,
                        id: item.id,
                      }))
                  
                  // Sempre mostrar 10 colunas, preenchendo com itens vazios se necessário
                  const dados = [...dadosFonte]
                  while (dados.length < 10) {
                    dados.push({
                      nome: "",
                      consumo_30d: 0,
                      id: `empty-${dados.length}`,
                    })
                  }
                  return dados.slice(0, 10)
                })()}
          type="bar"
          dataKey="consumo_30d"
          xAxisKey="nome"
          color="#3b82f6"
          height={320}
        />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <KpiList
            title="Itens com Estoque Crítico"
            description="Abaixo do ponto de ressuprimento"
            items={data.itensEstoqueCritico}
            columns={[
              {
                key: "quantidade_atual",
                label: "Atual",
              },
              {
                key: "ponto_ressuprimento",
                label: "PRD",
              },
              {
                key: "deficit",
                label: "Déficit",
                render: (item) => (
                  <Badge variant="destructive" className="font-semibold">
                    -{item.deficit}
                  </Badge>
                ),
              },
            ]}
            maxItems={3}
          />

          <KpiList
            title="Maior Consumo Recente"
            description="Últimos 30 dias"
            items={data.itensMaiorConsumo}
            columns={[
              {
                key: "consumo_30d",
                label: "Total 30d",
                render: (item) => (
                  <Badge variant="outline" className="font-semibold">
                    {item.consumo_30d.toFixed(0)}
                  </Badge>
                ),
              },
              {
                key: "consumo_medio_diario",
                label: "Média/dia",
                render: (item) => item.consumo_medio_diario.toFixed(1),
              },
            ]}
            maxItems={3}
          />
        </div>
      </section>

      {/* SESSÃO 3: EPIs */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-zinc-700" />
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">EPIs</h2>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <KpiList
            title="EPIs Ativos por Colaborador"
            description="Total de EPIs atualmente atribuídos"
            items={data.episAtivosPorColaborador.map((epi) => ({
              id: epi.colaborador_id,
              nome: epi.colaborador_nome,
              total_epis: epi.total_epis,
              epis: epi.epis,
            }))}
            columns={[
              {
                key: "total_epis",
                label: "Total EPIs",
                render: (item) => (
                  <Badge variant="outline" className="font-semibold">
                    {item.total_epis}
                  </Badge>
                ),
              },
            ]}
            maxItems={3}
          />

          <KpiList
            title="EPIs Próximos da Validade"
            description="Vencimento em até 30 dias"
            items={data.episProximosValidade}
            columns={[
              {
                key: "dias_restantes",
                label: "Dias Restantes",
                render: (item) => (
                  <Badge
                    variant={item.dias_restantes <= 7 ? "destructive" : "secondary"}
                    className="font-semibold"
                  >
                    {item.dias_restantes} dias
                  </Badge>
                ),
              },
              {
                key: "validade",
                label: "Validade",
                render: (item) =>
                  new Date(item.validade).toLocaleDateString("pt-BR"),
              },
            ]}
            maxItems={3}
          />
        </div>
      </section>

      {/* SESSÃO 4: PREVISÕES */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-zinc-700" />
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">
            Previsões e Alertas
          </h2>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.riscoRuptura
            .filter((r) => r.score >= 50)
            .slice(0, 3)
            .map((risco) => (
              <KPICard
                key={risco.id}
                title={risco.nome}
                value={`${risco.score.toFixed(0)}%`}
                description={`${risco.dias_restantes} dias restantes`}
                iconName="AlertTriangle"
                variant={risco.score >= 80 ? "destructive" : "default"}
              />
            ))}
        </div>

        <KpiList
          title="Itens Críticos do Dia"
          description="Itens que requerem atenção imediata"
          items={data.itensCriticosDia}
          columns={[
            {
              key: "motivo",
              label: "Motivo",
            },
            {
              key: "prioridade",
              label: "Prioridade",
              render: (item) => (
                <Badge
                  variant={
                    item.prioridade === "alta"
                      ? "destructive"
                      : item.prioridade === "media"
                      ? "secondary"
                      : "outline"
                  }
                  className="font-semibold"
                >
                  {item.prioridade.toUpperCase()}
                </Badge>
              ),
            },
            {
              key: "acao_sugerida",
              label: "Ação",
            },
          ]}
          maxItems={15}
        />

        {/* Gráfico de Risco de Ruptura */}
        {data.riscoRuptura.length > 0 && (
          <KpiChart
            title="Risco de Ruptura por Item"
            description="O Risco de Ruptura é um indicador que estima a probabilidade de um item consumível acabar o estoque (ruptura de estoque). Score de 0-100 (quanto maior, maior o risco)"
            data={(() => {
              // Filtrar e ordenar dados reais
              const dadosReais = data.riscoRuptura
                .filter((r) => r.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((r) => ({
                  nome: r.nome.length > 20 ? r.nome.substring(0, 20) + "..." : r.nome,
                  score: r.score,
                  id: r.id,
                }))
              
              // Sempre mostrar 10 colunas, preenchendo com itens vazios se necessário
              const dados = [...dadosReais]
              while (dados.length < 10) {
                dados.push({
                  nome: "",
                  score: 0,
                  id: `empty-${dados.length}`,
                })
              }
              return dados.slice(0, 10)
            })()}
            type="bar"
            dataKey="score"
            xAxisKey="nome"
            color="#ef4444"
            height={300}
          />
        )}
      </section>
    </div>
  )
}
