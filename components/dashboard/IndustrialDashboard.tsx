"use client"

import { useKPIs } from "@/lib/hooks/useKPIs"
import { KPICard } from "./KPICard"
import { KpiList } from "./KpiList"
import { KpiChart } from "./KpiChart"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"

interface IndustrialDashboardProps {
  userId: string
}

export default function IndustrialDashboard({ userId }: IndustrialDashboardProps) {
  const { data, loading, error } = useKPIs(userId)

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
          <KPICard
            title="Índice de Atraso"
            value={`${data.indiceAtrasoDevolucao.toFixed(1)}%`}
            description="Devoluções após prazo"
            iconName="AlertTriangle"
            variant={data.indiceAtrasoDevolucao > 20 ? "destructive" : "default"}
          />
        </div>

        {/* Rankings - Ferramentas */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <KpiList
            title="Top Ferramentas Mais Utilizadas"
            description="Últimos 30 dias"
            items={data.topFerramentasUtilizadas}
            columns={[
              {
                key: "total_saidas",
                label: "Saídas",
                render: (item) => (
                  <Badge variant="outline" className="font-semibold">
                    {item.total_saidas}
                  </Badge>
                ),
              },
              {
                key: "categoria",
                label: "Categoria",
              },
            ]}
            maxItems={10}
          />

          <KpiList
            title="Ranking de Responsabilidade"
            description="Score baseado em devoluções no prazo"
            items={data.rankingResponsabilidade.map((item) => ({
              ...item,
              id: item.colaborador_id || item.nome,
            }))}
            columns={[
              {
                key: "score",
                label: "Score",
                render: (item) => (
                  <Badge
                    variant={item.score >= 80 ? "default" : item.score >= 60 ? "secondary" : "destructive"}
                    className="font-semibold"
                  >
                    {item.score.toFixed(0)}%
                  </Badge>
                ),
              },
              {
                key: "total_retiradas",
                label: "Retiradas",
              },
              {
                key: "devolucoes_no_prazo",
                label: "No Prazo",
              },
            ]}
            maxItems={10}
          />
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
            maxItems={15}
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

        <KpiChart
          title="Top consumíveis mais retirados"
          description="Últimos 30 dias"
          data={data.itensMaiorConsumo}
          type="bar"
          dataKey="consumo_30d"
          xAxisKey="nome"
          color="#3b82f6"
          height={320}
        />

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
            description="Score de 0-100 (quanto maior, maior o risco)"
            data={data.riscoRuptura
              .filter((r) => r.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 10)
              .map((r) => ({
                nome: r.nome.length > 20 ? r.nome.substring(0, 20) + "..." : r.nome,
                score: r.score,
              }))}
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
