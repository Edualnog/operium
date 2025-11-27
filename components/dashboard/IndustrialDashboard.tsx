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
            .select("id, nome, quantidade_disponivel, ponto_ressuprimento, categoria")
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

        // Criar lista de itens com prioridade
        const itensComPrioridade = ferramentas
          .map((f: any) => ({
            id: f.id,
            nome: f.nome,
            quantidade_disponivel: f.quantidade_disponivel || 0,
            ponto_ressuprimento: f.ponto_ressuprimento || 0,
            categoria: f.categoria,
            demanda: demandaPorItem[f.id] || 0,
            // Prioridade: maior demanda = maior prioridade
            prioridade: demandaPorItem[f.id] || 0,
          }))
          .filter((item: any) => item.demanda > 0) // Apenas itens com demanda
          .sort((a: any, b: any) => b.prioridade - a.prioridade) // Ordenar por prioridade decrescente
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
          .gte("data", dozeMesesAtras.toISOString())

        if (movError) {
          console.error("Erro ao buscar movimentações mensais:", movError)
          setLoadingMovMensais(false)
          return
        }

        // Agrupar por mês
        const porMes: Record<string, number> = {}
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        
        movimentacoes?.forEach((mov: any) => {
          const date = new Date(mov.data)
          const mesAno = `${meses[date.getMonth()]}`
          porMes[mesAno] = (porMes[mesAno] || 0) + 1
        })

        // Criar array com últimos 12 meses
        const resultado = []
        const hoje = new Date()
        for (let i = 11; i >= 0; i--) {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
          const mes = meses[d.getMonth()]
          resultado.push({
            mes,
            total: porMes[mes] || 0,
          })
        }

        setMovimentacoesMensais(resultado)
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

        // Contar status
        let disponiveis = 0
        let emUso = 0
        let manutencao = 0

        ferramentas?.forEach((f: any) => {
          if (f.estado === "manutencao" || f.estado === "danificado") {
            manutencao++
          } else if (f.quantidade_disponivel < f.quantidade_total) {
            emUso++
          } else {
            disponiveis++
          }
        })

        const total = ferramentas?.length || 0
        if (total > 0) {
          setStatusFerramentas({
            disponiveis: Math.round((disponiveis / total) * 100),
            emUso: Math.round((emUso / total) * 100),
            manutencao: Math.round((manutencao / total) * 100),
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
          <Card className="lg:col-span-2 border border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold text-zinc-900">
                    Movimentações
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-zinc-600 mt-1">
                    Últimos 12 meses
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs text-zinc-500">Entradas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-xs text-zinc-500">Saídas</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingMovMensais ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-sm text-zinc-500">Carregando...</p>
                </div>
              ) : (
                <div className="h-48 flex items-end gap-1 sm:gap-2">
                  {movimentacoesMensais.map((item, index) => {
                    const maxValue = Math.max(...movimentacoesMensais.map(m => m.total), 1)
                    const height = (item.total / maxValue) * 100
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t-sm transition-all hover:from-blue-600 hover:to-indigo-600"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${item.mes}: ${item.total} movimentações`}
                        />
                        <span className="text-[10px] sm:text-xs text-zinc-400">{item.mes}</span>
                      </div>
                    )
                  })}
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
                    {data.itensEstoqueCritico.length + data.itensMaiorConsumo.length}
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
                    {data.rankingResponsabilidade.length}
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
                    {data.topFerramentasUtilizadas.length}
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
                    {movimentacoesMensais.length > 0 ? movimentacoesMensais[movimentacoesMensais.length - 1]?.total || 0 : 0}
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
            value={data.ferramentasEmUso.length}
            description="Unidades atualmente emprestadas"
            iconName="Activity"
          />
          <KPICard
            title="Ferramentas Estragadas"
            value={data.ferramentasEstragadas?.length || 0}
            description="Em manutenção ou danificadas"
            iconName="AlertTriangle"
            variant={(data.ferramentasEstragadas?.length || 0) > 0 ? "destructive" : "default"}
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
            maxItems={10}
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
            maxItems={10}
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
            maxItems={15}
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
            maxItems={15}
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
