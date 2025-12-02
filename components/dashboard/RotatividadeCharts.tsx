"use client"

import { useEffect, useState, useMemo, memo } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
  ComposedChart,
} from "recharts"
import { TrendingUp, TrendingDown, AlertTriangle, Package } from "lucide-react"

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
}

interface FerramentaRotatividade {
  id: string
  nome: string
  categoria?: string
  quantidade_total: number
  quantidade_disponivel: number
  total_saidas: number
  rotatividade: number
  dias_restantes?: number
}

function RotatividadeCharts({ userId }: { userId: string }) {
  const [rotatividade, setRotatividade] = useState<FerramentaRotatividade[]>([])
  const [tendenciaConsumo, setTendenciaConsumo] = useState<any[]>([])
  const [consumoPorCategoria, setConsumoPorCategoria] = useState<any[]>([])
  const [alertasEstoque, setAlertasEstoque] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      const supabase = createClientComponentClient()

      // Período de análise: últimos 90 dias
      const noventaDiasAtras = new Date()
      noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90)
      const trintaDiasAtras = new Date()
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

      const [
        ferramentasResult,
        movimentacoesResult,
        movimentacoesTendencia,
        movimentacoesCategoria,
      ] = await Promise.all([
        // Buscar todas as ferramentas
        supabase
          .from("ferramentas")
          .select("id, nome, categoria, quantidade_total, quantidade_disponivel")
          .eq("profile_id", userId),
        // Buscar movimentações de saída (retiradas) dos últimos 90 dias
        supabase
          .from("movimentacoes")
          .select("ferramenta_id, quantidade, data")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", noventaDiasAtras.toISOString()),
        // Movimentações para tendência (últimos 30 dias, agrupadas por semana)
        supabase
          .from("movimentacoes")
          .select("data, quantidade, ferramentas(categoria)")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", trintaDiasAtras.toISOString())
          .order("data", { ascending: true }),
        // Movimentações por categoria
        supabase
          .from("movimentacoes")
          .select("quantidade, ferramentas(categoria)")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", trintaDiasAtras.toISOString()),
      ])

      if (cancelled) return

      // Calcular rotatividade por ferramenta
      if (ferramentasResult.data && movimentacoesResult.data) {
        const rotatividadeMap: Record<string, FerramentaRotatividade> = {}

        // Inicializar todas as ferramentas
        ferramentasResult.data.forEach((ferramenta) => {
          rotatividadeMap[ferramenta.id] = {
            id: ferramenta.id,
            nome: ferramenta.nome,
            categoria: ferramenta.categoria || "Sem categoria",
            quantidade_total: ferramenta.quantidade_total,
            quantidade_disponivel: ferramenta.quantidade_disponivel,
            total_saidas: 0,
            rotatividade: 0,
          }
        })

        // Calcular total de saídas por ferramenta
        movimentacoesResult.data.forEach((mov) => {
          if (rotatividadeMap[mov.ferramenta_id]) {
            rotatividadeMap[mov.ferramenta_id].total_saidas += mov.quantidade
          }
        })

        // Calcular rotatividade (saídas por dia nos últimos 90 dias)
        const diasAnalise = 90
        Object.values(rotatividadeMap).forEach((ferramenta) => {
          const rotatividadeDiaria = ferramenta.total_saidas / diasAnalise
          ferramenta.rotatividade = rotatividadeDiaria

          // Calcular dias restantes (se houver consumo)
          if (rotatividadeDiaria > 0 && ferramenta.quantidade_disponivel > 0) {
            ferramenta.dias_restantes = Math.floor(
              ferramenta.quantidade_disponivel / rotatividadeDiaria
            )
          }
        })

        // Ordenar por rotatividade e pegar top 15
        const rotatividadeArray = Object.values(rotatividadeMap)
          .filter((f) => f.total_saidas > 0)
          .sort((a, b) => b.rotatividade - a.rotatividade)
          .slice(0, 15)

        setRotatividade(rotatividadeArray)

        // Identificar alertas de estoque baixo
        const alertas = rotatividadeArray
          .filter((f) => {
            const percentualDisponivel =
              (f.quantidade_disponivel / f.quantidade_total) * 100
            return (
              percentualDisponivel < 30 ||
              (f.dias_restantes && f.dias_restantes < 30)
            )
          })
          .map((f) => ({
            ...f,
            prioridade:
              f.dias_restantes && f.dias_restantes < 7
                ? "urgente"
                : f.dias_restantes && f.dias_restantes < 15
                ? "alta"
                : "média",
          }))
          .sort((a, b) => {
            const diasA = a.dias_restantes || 999
            const diasB = b.dias_restantes || 999
            return diasA - diasB
          })

        setAlertasEstoque(alertas)
      }

      // Processar tendência de consumo (últimos 30 dias por semana)
      if (movimentacoesTendencia.data) {
        const porSemana: Record<string, number> = {}
        movimentacoesTendencia.data.forEach((mov) => {
          const data = new Date(mov.data)
          // Calcular semana do mês (1-4)
          const diaDoMes = data.getDate()
          const semana = `Sem ${Math.ceil(diaDoMes / 7)}`
          porSemana[semana] = (porSemana[semana] || 0) + (mov.quantidade || 0)
        })

        const semanas = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"]
        const tendencia = semanas.map((semana) => ({
          semana,
          quantidade: porSemana[semana] || 0,
        }))

        // Calcular média móvel e previsão
        const tendenciaComPrevisao = tendencia.map((item, index) => {
          const ultimos3 = tendencia.slice(Math.max(0, index - 2), index + 1)
          const media =
            ultimos3.length > 0
              ? ultimos3.reduce((sum, i) => sum + i.quantidade, 0) /
                ultimos3.length
              : item.quantidade

          // Previsão para próxima semana (baseada na tendência)
          const previsao = index === tendencia.length - 1 ? media * 1.1 : null

          return {
            ...item,
            media: Math.round(media),
            previsao: previsao ? Math.round(previsao) : null,
          }
        })

        setTendenciaConsumo(tendenciaComPrevisao)
      }

      // Processar consumo por categoria
      if (movimentacoesCategoria.data) {
        const porCategoria: Record<string, number> = {}
        movimentacoesCategoria.data.forEach((mov) => {
          const categoria =
            (mov.ferramentas as any)?.categoria || "Sem categoria"
          porCategoria[categoria] =
            (porCategoria[categoria] || 0) + mov.quantidade
        })

        setConsumoPorCategoria(
          Object.entries(porCategoria)
            .map(([categoria, quantidade]) => ({
              categoria,
              quantidade,
            }))
            .sort((a, b) => b.quantidade - a.quantidade)
        )
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Carregando análises...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alertas de Estoque */}
      {alertasEstoque.length > 0 && (
        <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 sm:pb-4 lg:pb-6 border-b border-orange-200/50">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-zinc-900">
                <div className="p-1.5 sm:p-2 lg:p-2.5 rounded-lg bg-orange-100 flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
                </div>
                <span className="truncate">Alertas de Estoque</span>
              </CardTitle>
              <Badge variant="destructive" className="bg-red-600 text-white flex-shrink-0 text-xs sm:text-sm lg:text-base px-2 sm:px-3 py-1 sm:py-1.5">{alertasEstoque.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6 lg:pt-8">
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {alertasEstoque.slice(0, 5).map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 lg:gap-6 rounded-xl border border-orange-200/50 bg-white p-3 sm:p-4 lg:p-5 xl:p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base lg:text-lg xl:text-xl text-zinc-900 truncate">{alerta.nome}</p>
                    <p className="text-xs sm:text-sm lg:text-base text-zinc-600 mt-0.5 lg:mt-1">
                      {alerta.categoria} • {alerta.quantidade_disponivel}/
                      {alerta.quantidade_total} disponíveis
                    </p>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    {alerta.dias_restantes ? (
                      <>
                        <div className={`inline-flex items-center gap-1 px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-full text-xs sm:text-sm lg:text-base font-bold ${
                          alerta.dias_restantes < 7
                            ? "bg-red-100 text-red-700"
                            : alerta.dias_restantes < 15
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {alerta.dias_restantes} dias
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                          até esgotar
                        </p>
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm lg:text-base text-zinc-600">
                        Estoque baixo
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Top Ferramentas por Rotatividade */}
        <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 sm:pb-4 lg:pb-6 border-b border-zinc-100">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-zinc-900">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 flex-shrink-0" />
              <span className="truncate">Top Ferramentas por Rotatividade</span>
            </CardTitle>
            <p className="text-xs sm:text-sm lg:text-base text-zinc-600 mt-1 lg:mt-2">
              Últimos 90 dias - Saídas por dia
            </p>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-5">
            <div className="w-full h-[280px] sm:h-[300px] lg:h-[320px] xl:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rotatividade.slice(0, 10)}
                layout="vertical"
                margin={{ top: 15, right: 35, left: 140, bottom: 15 }}
              >
                <defs>
                  <linearGradient id="colorRotatividade" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  stroke="#d1d5db"
                />
                <YAxis
                  dataKey="nome"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  stroke="#d1d5db"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number) => [
                    `${value.toFixed(2)} saídas/dia`,
                    "Rotatividade",
                  ]}
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar dataKey="rotatividade" radius={[0, 8, 8, 0]}>
                  {rotatividade.slice(0, 10).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.dias_restantes && entry.dias_restantes < 15
                          ? COLORS.danger
                          : entry.dias_restantes && entry.dias_restantes < 30
                          ? COLORS.warning
                          : COLORS.primary
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Consumo por Categoria */}
        <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 sm:pb-4 lg:pb-6 border-b border-zinc-100">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-zinc-900">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600 flex-shrink-0" />
              <span>Consumo por Categoria</span>
            </CardTitle>
            <p className="text-xs sm:text-sm lg:text-base text-zinc-600 mt-1 lg:mt-2">
              Últimos 30 dias
            </p>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-5">
            <div className="w-full h-[280px] sm:h-[300px] lg:h-[320px] xl:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumoPorCategoria} margin={{ top: 15, right: 25, left: 5, bottom: 80 }}>
                <defs>
                  <linearGradient id="colorCategoria" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                <XAxis
                  dataKey="categoria"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  stroke="#d1d5db"
                />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} stroke="#d1d5db" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
                />
                <Bar dataKey="quantidade" fill="url(#colorCategoria)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendência de Consumo e Previsão */}
      <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 sm:pb-4 lg:pb-6 border-b border-zinc-100">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-zinc-900">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600 flex-shrink-0" />
            <span className="truncate">Tendência de Consumo e Previsão</span>
          </CardTitle>
          <p className="text-xs sm:text-sm lg:text-base text-zinc-600 mt-1 lg:mt-2">
            Últimas 4 semanas e previsão para próxima semana
          </p>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-5">
          <div className="w-full h-[260px] sm:h-[280px] lg:h-[300px] xl:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={tendenciaConsumo}>
              <defs>
                <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#6b7280" }} stroke="#d1d5db" />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} stroke="#d1d5db" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                cursor={{ stroke: COLORS.primary, strokeWidth: 2 }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="quantidade"
                stroke={COLORS.primary}
                fillOpacity={1}
                fill="url(#colorConsumo)"
                name="Consumo Real"
                strokeWidth={2}
              />
              {tendenciaConsumo.some((item) => item.previsao !== null) && (
                <Line
                  type="monotone"
                  dataKey="previsao"
                  stroke={COLORS.warning}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Previsão"
                  dot={{ fill: COLORS.warning, r: 5 }}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(RotatividadeCharts)

