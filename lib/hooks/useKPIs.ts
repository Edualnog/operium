"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { KPIData } from "@/lib/types/kpis"

export function useKPIs(userId: string) {
  const [data, setData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchKPIs() {
      try {
        const supabase = createClientComponentClient()
        const trintaDiasAtras = new Date()
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)

        const [
          retiradasRes,
          devolucoesRes,
          tmrRes,
          indiceRes,
          movimentacoes30dRes,
          colaboradoresRes,
          consumiveisRes,
          ferramentasRes,
          episMovRes,
          episRes,
        ] = await Promise.all([
          supabase
            .from("movimentacoes")
            .select(`
              id,
              ferramenta_id,
              colaborador_id,
              tipo,
              data,
              ferramentas(nome, tipo_item),
              colaboradores(nome)
            `)
            .eq("profile_id", userId)
            .eq("tipo", "retirada"),
          supabase
            .from("movimentacoes")
            .select("ferramenta_id, colaborador_id, data, tipo, ferramentas(tipo_item)")
            .eq("profile_id", userId)
            .eq("tipo", "devolucao"),
          supabase.rpc("calcular_tmr", { p_profile_id: userId }),
          supabase.rpc("calcular_indice_atraso", { p_profile_id: userId }),
          supabase
            .from("movimentacoes")
            .select("ferramenta_id, quantidade, data, ferramentas(nome, categoria)")
            .eq("profile_id", userId)
            .eq("tipo", "retirada")
            .gte("data", trintaDiasAtras.toISOString()),
          supabase.from("colaboradores").select("id, nome").eq("profile_id", userId),
          supabase
            .from("movimentacoes")
            .select("ferramenta_id, quantidade, data, ferramentas(tipo_item, nome, categoria)")
            .eq("profile_id", userId)
            .eq("tipo", "retirada")
            .gte("data", trintaDiasAtras.toISOString()),
          supabase
            .from("ferramentas")
            .select(
              "id, nome, quantidade_disponivel, ponto_ressuprimento, categoria, tipo_item, lead_time_dias, validade"
            )
            .eq("profile_id", userId),
          supabase
            .from("movimentacoes")
            .select(`
              colaborador_id,
              ferramenta_id,
              tipo,
              colaboradores(nome),
              ferramentas(nome, tipo_item, validade)
            `)
            .eq("profile_id", userId)
            .in("tipo", ["retirada", "devolucao"]),
          supabase
            .from("ferramentas")
            .select("id, nome, validade")
            .eq("profile_id", userId)
            .eq("tipo_item", "epi")
            .not("validade", "is", null),
        ])

        if (retiradasRes.error) throw retiradasRes.error
        if (devolucoesRes.error) throw devolucoesRes.error
        if (movimentacoes30dRes.error) throw movimentacoes30dRes.error
        if (colaboradoresRes.error) throw colaboradoresRes.error
        if (consumiveisRes.error) throw consumiveisRes.error
        if (ferramentasRes.error) throw ferramentasRes.error
        if (episMovRes.error) throw episMovRes.error
        if (episRes.error) throw episRes.error

        const retiradas = retiradasRes.data || []
        const devolucoes = devolucoesRes.data || []
        const ferramentas = ferramentasRes.data || []

        // Ferramentas em uso (retiradas sem devolução posterior)
        const ferramentasEmUso = retiradas
          .filter((ret) => {
            const foiDevolvida = devolucoes.some(
              (dev) =>
                dev.ferramenta_id === ret.ferramenta_id &&
                dev.colaborador_id === ret.colaborador_id &&
                dev.data &&
                ret.data &&
                new Date(dev.data) > new Date(ret.data)
            )
            return !foiDevolvida
          })
          .map((ret) => {
            const saida = ret.data ? new Date(ret.data) : new Date()
            const agora = new Date()
            const diasEmUso = Math.floor((agora.getTime() - saida.getTime()) / (1000 * 60 * 60 * 24))

            return {
              id: ret.id,
              nome: (ret.ferramentas as any)?.nome || "Desconhecida",
              colaborador: (ret.colaboradores as any)?.nome || "Sem colaborador",
              saida_at: ret.data || "",
              prazo_devolucao: undefined,
              dias_em_uso: diasEmUso,
            }
          })

        // Índice de atraso
        const indiceAtraso = indiceRes.error ? 0 : Number(indiceRes.data) || 0

        // Ferramentas estragadas (danificada ou em conserto)
        const ferramentasEstragadas = (ferramentas || []).filter(
          (f: any) => f.estado === "danificada" || f.estado === "em_conserto"
        )

        const movimentacoes30d = movimentacoes30dRes.data || []

        const rankingFerramentas: Record<string, any> = {}
        movimentacoes30d?.forEach((mov) => {
          const id = mov.ferramenta_id
          if (!rankingFerramentas[id]) {
            rankingFerramentas[id] = {
              id,
              nome: (mov.ferramentas as any)?.nome || "Desconhecida",
              total_saidas: 0,
              categoria: (mov.ferramentas as any)?.categoria,
            }
          }
          rankingFerramentas[id].total_saidas += mov.quantidade || 0
        })

        const topFerramentasUtilizadas = Object.values(rankingFerramentas)
          .sort((a: any, b: any) => b.total_saidas - a.total_saidas)
          .slice(0, 10)

        // Ranking de responsabilidade (evita novas queries: usa retiradas/devoluções já carregadas)
        const colaboradores = colaboradoresRes.data || []
        const rankingCompleto = colaboradores.map((colab) => {
          // Filtrar EPIs - EPIs não contam para taxa de devolução (ficam com os colaboradores)
          const retiradasColab = retiradas.filter((r) => {
            if (r.colaborador_id !== colab.id) return false
            const ferramenta = r.ferramentas as any
            return ferramenta?.tipo_item !== "epi"
          })
          const devolucoesColab = devolucoes.filter((d) => {
            if (d.colaborador_id !== colab.id) return false
            const ferramenta = d.ferramentas as any
            return ferramenta?.tipo_item !== "epi"
          })
          const totalRetiradas = retiradasColab.length
          const totalDevolucoes = devolucoesColab.length

          // Score começa em 100% e só cai quando há retiradas não devolvidas
          let score = 100
          if (totalRetiradas > 0 && totalDevolucoes < totalRetiradas) {
            score = Math.max(0, (totalDevolucoes / totalRetiradas) * 100)
          }

          return {
            colaborador_id: colab.id,
            nome: colab.nome,
            score,
            total_retiradas: totalRetiradas,
            devolucoes_no_prazo: Math.min(totalDevolucoes, totalRetiradas),
          }
        })

        const rankingOrdenado = rankingCompleto.sort((a, b) => b.score - a.score)
        const rankingResponsabilidade =
          rankingOrdenado.length > 1
            ? [rankingOrdenado[0], rankingOrdenado[rankingOrdenado.length - 1]]
            : rankingOrdenado

        // 6. CONSUMO MÉDIO DIÁRIO (Consumíveis - últimos 30 dias)
        const consumiveisMov = consumiveisRes.data || []
        const consumiveis = consumiveisMov.filter(
          (m) => (m.ferramentas as any)?.tipo_item === "consumivel"
        )

        const totalConsumo = consumiveis.reduce(
          (acc, m) => acc + (m.quantidade || 0),
          0
        )
        const consumoMedioDiario = totalConsumo / 30

        const itensEstoqueCritico = (ferramentas || [])
          .filter(
            (f) =>
              f.quantidade_disponivel < f.ponto_ressuprimento &&
              f.ponto_ressuprimento > 0
          )
          .map((f) => ({
            id: f.id,
            nome: f.nome,
            quantidade_atual: f.quantidade_disponivel,
            ponto_ressuprimento: f.ponto_ressuprimento,
            deficit: f.ponto_ressuprimento - f.quantidade_disponivel,
            categoria: f.categoria,
          }))
          .sort((a, b) => b.deficit - a.deficit)

        // 8. ITENS COM MAIOR CONSUMO RECENTE (30 dias)
        const consumoPorItem: Record<string, any> = {}
        consumiveis.forEach((mov: any) => {
          const id = mov.ferramenta_id
          if (!consumoPorItem[id]) {
            consumoPorItem[id] = {
              id,
              nome: (mov.ferramentas as any)?.nome || "Desconhecido",
              consumo_30d: 0,
              categoria: (mov.ferramentas as any)?.categoria,
            }
          }
          consumoPorItem[id].consumo_30d += mov.quantidade || 0
        })

        const itensMaiorConsumo = Object.values(consumoPorItem)
          .map((item: any) => ({
            ...item,
            consumo_medio_diario: item.consumo_30d / 30,
          }))
          .sort((a: any, b: any) => b.consumo_30d - a.consumo_30d)
          .slice(0, 10)

        const episMov = episMovRes.data || []

        const episAtivos: Record<string, any> = {}
        const episDevolvidos = new Set<string>()

        episMov?.forEach((mov) => {
          const ferramenta = mov.ferramentas as any
          if (ferramenta?.tipo_item !== "epi") return

          const key = `${mov.colaborador_id}-${mov.ferramenta_id}`

          if (mov.tipo === "devolucao") {
            episDevolvidos.add(key)
            return
          }

          if (mov.tipo === "retirada" && !episDevolvidos.has(key)) {
            const colabId = mov.colaborador_id || ""
            if (!episAtivos[colabId]) {
              episAtivos[colabId] = {
                colaborador_id: colabId,
                colaborador_nome: (mov.colaboradores as any)?.nome || "Desconhecido",
                total_epis: 0,
                epis: [],
              }
            }
            episAtivos[colabId].total_epis++
            episAtivos[colabId].epis.push({
              id: mov.ferramenta_id,
              nome: ferramenta.nome,
              validade: ferramenta.validade || undefined,
            })
          }
        })

        const episAtivosPorColaborador = Object.values(episAtivos)

        // 10. EPIs PRÓXIMOS DA VALIDADE (<=30 dias)
        const epis = episRes.data || []

        const agora = new Date()
        const trintaDiasFuturo = new Date()
        trintaDiasFuturo.setDate(trintaDiasFuturo.getDate() + 30)

        const episProximosValidade = (epis || [])
          .map((epi) => {
            const validade = new Date(epi.validade || "")
            const diasRestantes = Math.floor(
              (validade.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)
            )

            return {
              id: epi.id,
              nome: epi.nome,
              validade: epi.validade || "",
              dias_restantes: diasRestantes,
            }
          })
          .filter((epi) => epi.dias_restantes >= 0 && epi.dias_restantes <= 30)
          .sort((a, b) => a.dias_restantes - b.dias_restantes)

        // 11. RISCO DE RUPTURA
        const riscoRuptura = await Promise.all(
          (ferramentas || [])
            .filter((f: any) => f.tipo_item === "consumivel")
            .map(async (f: any) => {
              const { data: risco, error: err12 } = await supabase.rpc(
                "calcular_risco_ruptura",
                {
                  p_profile_id: userId,
                  p_ferramenta_id: f.id,
                }
              )

              if (err12) {
                // Se a função não existir, calcular manualmente
                const consumoMedio = (consumiveisMov || [])
                  .filter((m: any) => m.ferramenta_id === f.id)
                  .reduce((acc: number, m: any) => acc + (m.quantidade || 0), 0) / 30

                const leadTime = f.lead_time_dias || 7
                const estoque = f.quantidade_disponivel || 0
                const score = estoque > 0 
                  ? Math.min((consumoMedio * leadTime) / estoque * 100, 100)
                  : 100

                const diasRestantes =
                  estoque > 0 && consumoMedio > 0
                    ? Math.floor(estoque / consumoMedio)
                    : 0

                return {
                  id: f.id,
                  nome: f.nome,
                  score: score,
                  consumo_medio_diario: consumoMedio,
                  lead_time: leadTime,
                  estoque_atual: estoque,
                  dias_restantes: diasRestantes,
                }
              }

              const consumoMedio = (consumiveisMov || [])
                .filter((m: any) => m.ferramenta_id === f.id)
                .reduce((acc: number, m: any) => acc + (m.quantidade || 0), 0) / 30

              const diasRestantes =
                f.quantidade_disponivel > 0 && consumoMedio > 0
                  ? Math.floor(f.quantidade_disponivel / consumoMedio)
                  : 0

              return {
                id: f.id,
                nome: f.nome,
                score: Number(risco) || 0,
                consumo_medio_diario: consumoMedio,
                lead_time: f.lead_time_dias || 7,
                estoque_atual: f.quantidade_disponivel,
                dias_restantes: diasRestantes,
              }
            })
        )

        // 12. ITENS CRÍTICOS DO DIA
        const itensCriticosDia: any[] = []

        // Adicionar itens com estoque crítico
        itensEstoqueCritico.forEach((item) => {
          itensCriticosDia.push({
            id: item.id,
            nome: item.nome,
            motivo: `Estoque abaixo do PRD (${item.quantidade_atual}/${item.ponto_ressuprimento})`,
            prioridade: item.deficit > item.ponto_ressuprimento ? "alta" : "media",
            acao_sugerida: "Repor estoque urgentemente",
          })
        })

        // Adicionar EPIs próximos da validade
        episProximosValidade.slice(0, 5).forEach((epi) => {
          itensCriticosDia.push({
            id: epi.id,
            nome: epi.nome,
            motivo: `Validade em ${epi.dias_restantes} dias`,
            prioridade: epi.dias_restantes <= 7 ? "alta" : "media",
            acao_sugerida: "Renovar EPI antes da validade",
          })
        })

        // Adicionar itens com alto risco de ruptura
        riscoRuptura
          .filter((r) => r.score >= 70)
          .slice(0, 5)
          .forEach((r) => {
            itensCriticosDia.push({
              id: r.id,
              nome: r.nome,
              motivo: `Risco de ruptura: ${r.score.toFixed(0)}%`,
              prioridade: r.score >= 90 ? "alta" : "media",
              acao_sugerida: `Repor em ${r.dias_restantes} dias`,
            })
          })

        if (!cancelled) {
          setData({
            ferramentasEmUso,
            tempoMedioRetorno: { horas: 0, dias: 0, minutos: 0 },
            indiceAtrasoDevolucao: Number(indiceAtraso) || 0,
            ferramentasEstragadas: ferramentasEstragadas.map((f: any) => ({
              id: f.id,
              nome: f.nome,
              estado: f.estado,
              quantidade_disponivel: f.quantidade_disponivel,
            })),
            topFerramentasUtilizadas: topFerramentasUtilizadas as any,
            rankingResponsabilidade,
            consumoMedioDiario,
            itensEstoqueCritico,
            itensMaiorConsumo: itensMaiorConsumo as any,
            episAtivosPorColaborador: episAtivosPorColaborador as any,
            episProximosValidade,
            riscoRuptura,
            itensCriticosDia,
          })
          setLoading(false)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Erro ao carregar KPIs")
          setLoading(false)
        }
      }
    }

    fetchKPIs()

    return () => {
      cancelled = true
    }
  }, [userId])

  return { data, loading, error }
}
