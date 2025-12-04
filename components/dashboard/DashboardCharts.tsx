"use client"

import { useEffect, useState, useMemo, memo } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"

function DashboardCharts({ userId }: { userId: string }) {
  const { t } = useTranslation('common')
  const [retiradasPorColaborador, setRetiradasPorColaborador] = useState<any[]>(
    []
  )
  const [movimentacoesPorDia, setMovimentacoesPorDia] = useState<any[]>([])
  const [distribuicaoEstados, setDistribuicaoEstados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const gridColor = isDark ? "#27272a" : "#e5e7eb" // zinc-800 : zinc-200
  const axisTextColor = isDark ? "#a1a1aa" : "#6b7280" // zinc-400 : zinc-500
  const axisLineColor = isDark ? "#3f3f46" : "#d1d5db" // zinc-700 : zinc-300
  const tooltipBg = isDark ? "rgba(24, 24, 27, 0.98)" : "rgba(255, 255, 255, 0.98)" // zinc-950 : white
  const tooltipBorder = isDark ? "#27272a" : "#e5e7eb" // zinc-800 : zinc-200
  const tooltipTextColor = isDark ? "#f4f4f5" : "#111827" // zinc-100 : gray-900
  const legendTextColor = isDark ? "#d4d4d8" : "#374151" // zinc-300 : gray-700

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      const supabase = createClientComponentClient()

      // Retiradas por colaborador (últimos 30 dias) - otimizado: apenas campos necessários
      const trintaDiasAtras = new Date()
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

      const [movimentacoesResult, movimentacoesDiaResult, ferramentasResult] = await Promise.all([
        supabase
          .from("movimentacoes")
          .select("quantidade, colaboradores(nome)")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", trintaDiasAtras.toISOString()),
        supabase
          .from("movimentacoes")
          .select("data, tipo")
          .eq("profile_id", userId)
          .gte("data", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("data", { ascending: true }),
        supabase
          .from("ferramentas")
          .select("estado")
          .eq("profile_id", userId),
      ])

      // Processar retiradas por colaborador
      if (movimentacoesResult.data) {
        const porColaborador: Record<string, number> = {}
        movimentacoesResult.data.forEach((mov) => {
          const nome =
            (mov.colaboradores as any)?.nome || t('common.no_collaborator')
          porColaborador[nome] = (porColaborador[nome] || 0) + mov.quantidade
        })
        setRetiradasPorColaborador(
          Object.entries(porColaborador).map(([nome, quantidade]) => ({
            nome,
            quantidade,
          }))
        )
      }

      // Processar movimentações por dia
      if (movimentacoesDiaResult.data) {
        const porDia: Record<string, number> = {}
        movimentacoesDiaResult.data.forEach((mov) => {
          const data = new Date(mov.data).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
          porDia[data] = (porDia[data] || 0) + 1
        })
        setMovimentacoesPorDia(
          Object.entries(porDia).map(([data, quantidade]) => ({
            data,
            quantidade,
          }))
        )
      }

      // Processar distribuição de estados
      if (ferramentasResult.data) {
        const estados: Record<string, number> = {}
        ferramentasResult.data.forEach((f) => {
          const estado = f.estado === "em_conserto" ? t('dashboard.status.in_repair') : f.estado === "danificada" ? t('dashboard.status.damaged') : t('dashboard.status.ok')
          estados[estado] = (estados[estado] || 0) + 1
        })
        setDistribuicaoEstados(
          Object.entries(estados).map(([name, value]) => ({ name, value }))
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

  // Memoizar cores para evitar recriação
  const chartColors = useMemo(() => COLORS, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="dark:text-zinc-50">{t('dashboard.charts.loading_charts')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-5 lg:gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Retiradas por Colaborador */}
      <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="pb-3 sm:pb-4 lg:pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t('dashboard.charts.withdrawals_by_collaborator.title')}</CardTitle>
          <p className="text-xs sm:text-sm lg:text-base text-zinc-600 mt-1 lg:mt-2 dark:text-zinc-400">{t('dashboard.kpi.last_30_days')}</p>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-5">
          <div className="w-full h-[260px] sm:h-[280px] lg:h-[300px] xl:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={retiradasPorColaborador}
                margin={{ top: 15, right: 25, left: 5, bottom: 50 }}
              >
                <defs>
                  <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 12, fill: axisTextColor }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke={axisLineColor}
                />
                <YAxis tick={{ fontSize: 12, fill: axisTextColor }} stroke={axisLineColor} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: tooltipTextColor,
                  }}
                  cursor={{ fill: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)" }}
                />
                <Bar
                  dataKey="quantidade"
                  fill="url(#colorBar)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Movimentações por Dia */}
      <Card className="border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="pb-3 sm:pb-4 lg:pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t('dashboard.charts.movements_by_day.title')}</CardTitle>
          <p className="text-xs sm:text-sm lg:text-base text-zinc-600 mt-1 lg:mt-2 dark:text-zinc-400">{t('dashboard.charts.movements_by_day.subtitle')}</p>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-5">
          <div className="w-full h-[260px] sm:h-[280px] lg:h-[300px] xl:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={movimentacoesPorDia}
                margin={{ top: 15, right: 25, left: 5, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorMovimentacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} />
                <XAxis dataKey="data" tick={{ fontSize: 12, fill: axisTextColor }} stroke={axisLineColor} />
                <YAxis tick={{ fontSize: 12, fill: axisTextColor }} stroke={axisLineColor} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: tooltipTextColor,
                  }}
                  cursor={{ stroke: "#10b981", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="quantidade"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorMovimentacoes)"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="quantidade"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", r: 5, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de Estados */}
      <Card className="lg:col-span-2 border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="pb-3 sm:pb-4 lg:pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t('dashboard.charts.tools_status_distribution.title')}</CardTitle>
          <p className="text-xs sm:text-sm lg:text-base text-zinc-600 mt-1 lg:mt-2 dark:text-zinc-400">{t('dashboard.charts.tools_status_distribution.subtitle')}</p>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-5">
          <div className="w-full h-[300px] sm:h-[320px] lg:h-[340px] xl:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribuicaoEstados}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) =>
                    `${name}\n${value} (${(percent * 100).toFixed(1)}%)`
                  }
                  outerRadius={140}
                  innerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  strokeWidth={3}
                  stroke="#fff"
                >
                  {distribuicaoEstados.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: tooltipTextColor,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={60}
                  iconType="circle"
                  formatter={(value) => <span style={{ fontSize: "14px", color: legendTextColor }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(DashboardCharts)
