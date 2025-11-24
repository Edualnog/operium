import { createServerComponentClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  Users,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react"
import DashboardCharts from "@/components/dashboard/DashboardCharts"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Buscar dados para KPIs - otimizado: apenas campos necessários
  const [ferramentas, colaboradores, movimentacoes24h, consertos] =
    await Promise.all([
      supabase
        .from("ferramentas")
        .select("estado, quantidade_total, quantidade_disponivel")
        .eq("profile_id", user.id),
      supabase
        .from("colaboradores")
        .select("id")
        .eq("profile_id", user.id),
      supabase
        .from("movimentacoes")
        .select("id")
        .eq("profile_id", user.id)
        .gte("data", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("consertos")
        .select("id")
        .eq("profile_id", user.id)
        .in("status", ["aguardando", "em_andamento"]),
    ])

  const totalFerramentas = ferramentas.data?.length || 0
  const ferramentasOk =
    ferramentas.data?.filter((f) => f.estado === "ok").length || 0
  const ferramentasDanificadas =
    ferramentas.data?.filter((f) => f.estado === "danificada").length || 0
  const ferramentasEmConserto = consertos.data?.length || 0
  const totalColaboradores = colaboradores.data?.length || 0
  const movimentacoes24hCount = movimentacoes24h.data?.length || 0

  // Calcular ferramentas em uso
  const ferramentasEmUso =
    ferramentas.data?.reduce(
      (acc, f) => acc + (f.quantidade_total - f.quantidade_disponivel),
      0
    ) || 0

  // Calcular risco de falta (disponibilidade < 20%)
  const riscoFalta =
    ferramentas.data?.filter((f) => {
      if (f.quantidade_total === 0) return false
      const percentual = (f.quantidade_disponivel / f.quantidade_total) * 100
      return percentual < 20 && percentual > 0
    }).length || 0

  const kpis = [
    {
      title: "Total de Ferramentas",
      value: totalFerramentas,
      icon: Package,
      description: "Ferramentas cadastradas",
    },
    {
      title: "Ferramentas em Uso",
      value: ferramentasEmUso,
      icon: Activity,
      description: "Unidades emprestadas",
    },
    {
      title: "Ferramentas Danificadas",
      value: ferramentasDanificadas,
      icon: AlertTriangle,
      description: "Necessitam atenção",
      variant: "destructive" as const,
    },
    {
      title: "Em Conserto",
      value: ferramentasEmConserto,
      icon: Wrench,
      description: "Aguardando retorno",
    },
    {
      title: "Total de Colaboradores",
      value: totalColaboradores,
      icon: Users,
      description: "Cadastrados no sistema",
    },
    {
      title: "Movimentações (24h)",
      value: movimentacoes24hCount,
      icon: TrendingUp,
      description: "Últimas 24 horas",
    },
    {
      title: "Risco de Falta",
      value: riscoFalta,
      icon: AlertTriangle,
      description: "Disponibilidade < 20%",
      variant: riscoFalta > 0 ? ("destructive" as const) : undefined,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu almoxarifado
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráficos */}
      <DashboardCharts userId={user.id} />
    </div>
  )
}
