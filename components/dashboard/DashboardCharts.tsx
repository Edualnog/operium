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
  PieChart,
  Pie,
  Cell,
} from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

function DashboardCharts({ userId }: { userId: string }) {
  const [retiradasPorColaborador, setRetiradasPorColaborador] = useState<any[]>(
    []
  )
  const [movimentacoesPorDia, setMovimentacoesPorDia] = useState<any[]>([])
  const [distribuicaoEstados, setDistribuicaoEstados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
            (mov.colaboradores as any)?.nome || "Sem colaborador"
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
          const estado = f.estado === "em_conserto" ? "Em Conserto" : f.estado === "danificada" ? "Danificada" : "OK"
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
        <Card>
          <CardHeader>
            <CardTitle>Carregando gráficos...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Retiradas por Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle>Retiradas por Colaborador (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={retiradasPorColaborador}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantidade" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Movimentações por Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações por Dia (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={movimentacoesPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="quantidade"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição de Estados */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Distribuição do Estado das Ferramentas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distribuicaoEstados}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distribuicaoEstados.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default memo(DashboardCharts)
