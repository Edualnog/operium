import { createServerComponentClient } from "@/lib/supabase-server"
import DashboardCharts from "@/components/dashboard/DashboardCharts"
import { KPICard } from "@/components/dashboard/KPICard"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { Suspense } from "react"

const RotatividadeCharts = dynamic(
  () => import("@/components/dashboard/RotatividadeCharts"),
  { ssr: false }
)

export const revalidate = 60 // Revalidar a cada 60 segundos

export default async function DashboardPage() {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Buscar dados para KPIs - otimizado: apenas campos necessários
  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
  
  const [ferramentas, colaboradores, movimentacoes24h, consertos, movimentacoes30d] =
    await Promise.all([
      supabase
        .from("ferramentas")
        .select("estado, quantidade_total, quantidade_disponivel, categoria")
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
      supabase
        .from("movimentacoes")
        .select("quantidade, tipo")
        .eq("profile_id", user.id)
        .eq("tipo", "retirada")
        .gte("data", trintaDiasAtras.toISOString()),
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

  // Calcular total de saídas nos últimos 30 dias
  const totalSaidas30d = movimentacoes30d.data?.reduce(
    (acc, m) => acc + m.quantidade,
    0
  ) || 0

  // Calcular média diária de saídas
  const mediaDiariaSaidas = totalSaidas30d / 30

  // Identificar categorias mais consumidas (EPIs, Consumíveis, etc)
  const categoriasMaisConsumidas = ferramentas.data?.reduce((acc: Record<string, number>, f) => {
    const cat = f.categoria || "Sem categoria"
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {}) || {}
  
  const topCategoria = Object.entries(categoriasMaisConsumidas)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || "N/A"

  // Calcular tendências (comparar com período anterior)
  const movimentacoesAnteriores = await supabase
    .from("movimentacoes")
    .select("id")
    .eq("profile_id", user.id)
    .gte("data", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .lt("data", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const movimentacoes24hAnterior = movimentacoesAnteriores.data?.length || 0
  const trendMovimentacoes = movimentacoes24hAnterior > 0
    ? ((movimentacoes24hCount - movimentacoes24hAnterior) / movimentacoes24hAnterior) * 100
    : 0

  // Gerar dados para mini-gráficos (últimos 7 dias)
  const movimentacoes7d = await supabase
    .from("movimentacoes")
    .select("data")
    .eq("profile_id", user.id)
    .gte("data", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("data", { ascending: true })

  // Criar array de 7 dias com contagem de movimentações
  const movimentacoesPorDia = Array(7).fill(0)
  movimentacoes7d.data?.forEach((mov) => {
    const dataMov = new Date(mov.data)
    const hoje = new Date()
    const diasAtras = Math.floor((hoje.getTime() - dataMov.getTime()) / (1000 * 60 * 60 * 24))
    if (diasAtras >= 0 && diasAtras < 7) {
      movimentacoesPorDia[6 - diasAtras] = (movimentacoesPorDia[6 - diasAtras] || 0) + 1
    }
  })

  // Normalizar dados para mini-gráficos (valores entre 0 e 100)
  const maxMovimentacoes = Math.max(...movimentacoesPorDia, 1)
  const chartData = movimentacoesPorDia.map((val) => 
    Math.round((val / maxMovimentacoes) * 100)
  )

  const kpis = [
    {
      title: "Total de Ferramentas",
      value: totalFerramentas,
      iconName: "Package" as const,
      description: "Ferramentas cadastradas",
      miniChart: {
        data: chartData,
        type: "bar" as const,
        color: "#3b82f6",
      },
    },
    {
      title: "Ferramentas em Uso",
      value: ferramentasEmUso,
      iconName: "Activity" as const,
      description: "Unidades emprestadas",
      trend: {
        value: 4.23,
        isPositive: true,
      },
      miniChart: {
        data: chartData,
        type: "area" as const,
        color: "#10b981",
      },
    },
    {
      title: "Ferramentas Danificadas",
      value: ferramentasDanificadas,
      iconName: "AlertTriangle" as const,
      description: "Necessitam atenção",
      variant: "destructive" as const,
      miniChart: {
        data: chartData,
        type: "bar" as const,
        color: "#ef4444",
      },
    },
    {
      title: "Em Conserto",
      value: ferramentasEmConserto,
      iconName: "Wrench" as const,
      description: "Aguardando retorno",
      miniChart: {
        data: chartData,
        type: "area" as const,
        color: "#f59e0b",
      },
    },
    {
      title: "Total de Colaboradores",
      value: totalColaboradores,
      iconName: "Users" as const,
      description: "Cadastrados no sistema",
      trend: {
        value: 2.5,
        isPositive: true,
      },
      miniChart: {
        data: chartData,
        type: "bar" as const,
        color: "#8b5cf6",
      },
    },
    {
      title: "Movimentações (24h)",
      value: movimentacoes24hCount,
      iconName: "TrendingUp" as const,
      description: "Últimas 24 horas",
      trend: {
        value: trendMovimentacoes,
        isPositive: trendMovimentacoes >= 0,
      },
      miniChart: {
        data: chartData,
        type: "area" as const,
        color: "#3b82f6",
      },
    },
    {
      title: "Risco de Falta",
      value: riscoFalta,
      iconName: "AlertTriangle" as const,
      description: "Disponibilidade < 20%",
      variant: riscoFalta > 0 ? ("destructive" as const) : undefined,
      miniChart: {
        data: chartData,
        type: "bar" as const,
        color: "#ef4444",
      },
    },
    {
      title: "Saídas (30 dias)",
      value: totalSaidas30d,
      iconName: "Zap" as const,
      description: "Total de retiradas",
      trend: {
        value: 8.5,
        isPositive: true,
      },
      miniChart: {
        data: chartData,
        type: "area" as const,
        color: "#10b981",
      },
    },
    {
      title: "Média Diária",
      value: Math.round(mediaDiariaSaidas * 10) / 10,
      iconName: "TrendingUp" as const,
      description: "Saídas por dia",
      trend: {
        value: 5.2,
        isPositive: true,
      },
      miniChart: {
        data: chartData,
        type: "bar" as const,
        color: "#f59e0b",
      },
    },
    {
      title: "Categoria Top",
      value: topCategoria,
      iconName: "ShoppingCart" as const,
      description: "Mais consumida",
      miniChart: {
        data: chartData,
        type: "area" as const,
        color: "#8b5cf6",
      },
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      <div className="mb-4 sm:mb-5 lg:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
            <p className="text-sm sm:text-base text-zinc-600 mt-1.5">
              Visão geral do seu almoxarifado
            </p>
          </div>
        </div>
      </div>

      {/* KPIs Grid - Design Moderno - Otimizado para Desktop */}
      <div className="grid gap-4 sm:gap-5 lg:gap-5 xl:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            iconName={kpi.iconName}
            trend={kpi.trend}
            miniChart={kpi.miniChart}
            variant={kpi.variant}
          />
        ))}
      </div>

      {/* Gráficos Básicos */}
      <Suspense fallback={<div className="h-[300px] animate-pulse bg-muted rounded-lg" />}>
        <DashboardCharts userId={user.id} />
      </Suspense>

      {/* Análises de Rotatividade e Previsão */}
      <div className="mt-5 sm:mt-6 lg:mt-8">
        <div className="mb-4 sm:mb-5 lg:mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900">Análises Avançadas</h2>
          <p className="text-sm sm:text-base text-zinc-600 mt-1">
            Rotatividade, consumo e previsão de compras
          </p>
        </div>
        <Suspense fallback={<div className="h-[300px] sm:h-[400px] lg:h-[500px] animate-pulse bg-zinc-100 rounded-lg" />}>
          <RotatividadeCharts userId={user.id} />
        </Suspense>
      </div>
    </div>
  )
}
