"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"
import type { KPIData } from "@/lib/types/kpis"
import { safeArray } from "@/lib/utils/safe-array"

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
          consertosAtivosRes,
        ] = await Promise.all([
          supabase
            .from("movimentacoes")
            .select(`
              id,
              ferramenta_id,
              colaborador_id,
              tipo,
              quantidade,
              data,
              ferramentas(nome, tipo_item),
              colaboradores(nome)
            `)
            .eq("profile_id", userId)
            .eq("tipo", "retirada"),
          supabase
            .from("movimentacoes")
            .select("ferramenta_id, colaborador_id, data, tipo, quantidade, ferramentas(tipo_item)")
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
          supabase.from("colaboradores").select("id, nome, almox_score, level, current_streak, max_streak").eq("profile_id", userId),
          supabase
            .from("movimentacoes")
            .select("ferramenta_id, quantidade, data, ferramentas(tipo_item, nome, categoria)")
            .eq("profile_id", userId)
            .eq("tipo", "retirada")
            .gte("data", trintaDiasAtras.toISOString()),
          supabase
            .from("ferramentas")
            .select(
              "id, nome, quantidade_disponivel, quantidade_total, ponto_ressuprimento, categoria, tipo_item, lead_time_dias, validade, estado"
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
          supabase
            .from("consertos")
            .select("id, ferramenta_id, data_envio")
            .eq("profile_id", userId)
            .neq("status", "concluido"),
        ])

        if (retiradasRes.error) throw retiradasRes.error
        if (devolucoesRes.error) throw devolucoesRes.error
        if (movimentacoes30dRes.error) throw movimentacoes30dRes.error
        if (colaboradoresRes.error) throw colaboradoresRes.error
        if (consumiveisRes.error) throw consumiveisRes.error
        if (ferramentasRes.error) throw ferramentasRes.error
        if (episMovRes.error) throw episMovRes.error
        if (episRes.error) throw episRes.error
        if (consertosAtivosRes.error) throw consertosAtivosRes.error

        const retiradas = safeArray(retiradasRes.data)
        const devolucoes = safeArray(devolucoesRes.data)
        const ferramentas = safeArray(ferramentasRes.data)
        const consertosAtivos = safeArray(consertosAtivosRes.data)

        // Movimentações relacionadas a consertos (para calcular unidades em conserto)
        let movimentacoesConserto: any[] = []
        if (consertosAtivos.length > 0) {
          const idsFerramentasConserto = Array.from(new Set(consertosAtivos.map((c: any) => c.ferramenta_id))).filter(Boolean)
          if (idsFerramentasConserto.length > 0) {
            const { data: movConcRes, error: movConcError } = await supabase
              .from("movimentacoes")
              .select("ferramenta_id, quantidade, data, tipo, observacoes")
              .eq("profile_id", userId)
              .in("ferramenta_id", idsFerramentasConserto)
              .in("tipo", ["conserto", "entrada"])

            if (movConcError) throw movConcError
            movimentacoesConserto = movConcRes || []
          }
        }

        // Ferramentas em uso (retiradas sem devolução posterior) - APENAS tipo_item = "ferramenta"
        let totalFerramentasEmUso = 0
        const ferramentasEmUso = retiradas
          .map((ret) => {
            // Filtrar apenas ferramentas (não consumíveis, não EPIs)
            const ferramenta = ret.ferramentas as any
            if (ferramenta?.tipo_item !== "ferramenta") {
              return null
            }

            // Verificar se foi devolvida
            const quantidadeRetirada = ret.quantidade || 1

            // Somar devoluções para a mesma ferramenta/colaborador após a retirada
            const quantidadeDevolvida = devolucoes.reduce((acc, dev) => {
              const devFerramenta = dev.ferramentas as any
              if (
                dev.ferramenta_id === ret.ferramenta_id &&
                dev.colaborador_id === ret.colaborador_id &&
                devFerramenta?.tipo_item === "ferramenta" &&
                dev.data &&
                ret.data &&
                new Date(dev.data) > new Date(ret.data)
              ) {
                return acc + (dev.quantidade || 1)
              }
              return acc
            }, 0)

            const quantidadeEmUso = Math.max(0, quantidadeRetirada - quantidadeDevolvida)
            if (quantidadeEmUso <= 0) return null

            return { ret, quantidadeEmUso }
          })
          .filter((item): item is { ret: any; quantidadeEmUso: number } => Boolean(item))
          .map(({ ret, quantidadeEmUso }) => {
            const saida = ret.data ? new Date(ret.data) : new Date()
            const agora = new Date()
            const diasEmUso = Math.floor((agora.getTime() - saida.getTime()) / (1000 * 60 * 60 * 24))

            totalFerramentasEmUso += quantidadeEmUso

            return {
              id: ret.id,
              nome: (ret.ferramentas as any)?.nome || "Desconhecida",
              colaborador: (ret.colaboradores as any)?.nome || "Sem colaborador",
              colaborador_id: ret.colaborador_id || "",
              ferramenta_id: ret.ferramenta_id || "",
              saida_at: ret.data || "",
              prazo_devolucao: undefined,
              dias_em_uso: diasEmUso,
              quantidade_em_uso: quantidadeEmUso,
            }
          })

        // Índice de atraso
        const indiceAtraso = indiceRes.error ? 0 : Number(indiceRes.data) || 0

        // Ferramentas estragadas (danificada ou em conserto)
        // Calcular unidades em conserto por ferramenta
        const unidadesEmConserto: Record<string, number> = {}
        consertosAtivos.forEach((conserto: any) => {
          const dataEnvioRef = conserto.data_envio || new Date().toISOString()
          const movFerramenta = movimentacoesConserto.filter((m) => m.ferramenta_id === conserto.ferramenta_id)

          // Envio
          let movEnvio = movFerramenta.find(
            (m) => m.tipo === "conserto" && (m.observacoes || "").includes(conserto.id)
          )

          if (!movEnvio) {
            movEnvio = movFerramenta
              .filter((m) => m.tipo === "conserto" && new Date(m.data) >= new Date(dataEnvioRef))
              .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())[0]
          }

          const quantidadeEnviada = movEnvio?.quantidade || 1

          // Retornos
          let quantidadeRetornada = movFerramenta
            .filter((m) => m.tipo === "entrada" && (m.observacoes || "").includes(conserto.id))
            .reduce((acc, m) => acc + (m.quantidade || 0), 0)

          if (quantidadeRetornada === 0) {
            quantidadeRetornada = movFerramenta
              .filter((m) => m.tipo === "entrada" && new Date(m.data) >= new Date(dataEnvioRef))
              .reduce((acc, m) => acc + (m.quantidade || 0), 0)
          }

          const restante = quantidadeEnviada - quantidadeRetornada
          if (restante > 0) {
            unidadesEmConserto[conserto.ferramenta_id] =
              (unidadesEmConserto[conserto.ferramenta_id] || 0) + restante
          }
        })

        const ferramentasEstragadas = (ferramentas || [])
          .map((f: any) => {
            let quantidadeUnidades = 0
            if (f.estado === "danificada") {
              quantidadeUnidades = f.quantidade_total || 0
            } else if (f.estado === "em_conserto") {
              quantidadeUnidades = unidadesEmConserto[f.id] || 0
            }

            if (quantidadeUnidades <= 0) return null

            return {
              id: f.id,
              nome: f.nome,
              estado: f.estado,
              quantidade_disponivel: f.quantidade_disponivel,
              quantidade_unidades: quantidadeUnidades,
            }
          })
          .filter(Boolean) as any


        const movimentacoes30d = safeArray(movimentacoes30dRes.data)

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

        // Ranking de responsabilidade - usa almox_score do banco de dados
        const colaboradores = safeArray(colaboradoresRes.data)
        const rankingCompleto = colaboradores.map((colab: any) => {
          // Considerar apenas categoria "ferramenta" (excluir EPIs e consumíveis)
          const retiradasColab = retiradas.filter((r) => {
            if (r.colaborador_id !== colab.id) return false
            const ferramenta = r.ferramentas as any
            return ferramenta?.tipo_item === "ferramenta"
          })

          const devolucoesColab = devolucoes.filter((d) => {
            if (d.colaborador_id !== colab.id) return false
            const ferramenta = d.ferramentas as any
            return ferramenta?.tipo_item === "ferramenta"
          })

          // Contabilizar por quantidade (unidades)
          const totalRetiradas = retiradasColab.reduce(
            (acc, r) => acc + (r.quantidade || 1),
            0
          )

          const totalDevolucoes = devolucoesColab.reduce(
            (acc, d) => acc + (d.quantidade || 1),
            0
          )

          // Usar almox_score do banco (ou calcular fallback se não existir)
          const almoxScore = colab.almox_score || 500
          const level = colab.level || 'MEMBER'

          // Score percentual para compatibilidade
          const scorePercentual = totalRetiradas > 0
            ? Math.max(0, Math.min(100, (totalDevolucoes / totalRetiradas) * 100))
            : 100

          return {
            colaborador_id: colab.id,
            nome: colab.nome,
            score: scorePercentual, // Mantém score percentual para compatibilidade
            almox_score: almoxScore, // Novo: score gamificado
            level: level, // Novo: nível do colaborador
            current_streak: colab.current_streak || 0, // Streak atual
            max_streak: colab.max_streak || 0, // Recorde de streak
            total_retiradas: totalRetiradas,
            devolucoes_no_prazo: totalDevolucoes,
          }
        })

        // Ordenar por almox_score (maior = melhor)
        const rankingOrdenado = rankingCompleto.sort((a, b) => b.almox_score - a.almox_score)
        const rankingResponsabilidade = rankingOrdenado

        // 6. CONSUMO MÉDIO DIÁRIO (Consumíveis - últimos 30 dias)
        const consumiveisMov = safeArray(consumiveisRes.data)
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


        const episMov = safeArray(episMovRes.data)

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
        const epis = safeArray(episRes.data)

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
              // Consumo médio diário (30 dias)
              const consumoMedio = (consumiveisMov || [])
                .filter((m: any) => m.ferramenta_id === f.id)
                .reduce((acc: number, m: any) => acc + (m.quantidade || 0), 0) / 30

              const leadTime = f.lead_time_dias || 7
              const estoque = f.quantidade_disponivel || 0
              const pontoRessuprimento = f.ponto_ressuprimento || 0

              const diasRestantes =
                consumoMedio > 0 && estoque > 0
                  ? Math.floor(estoque / consumoMedio)
                  : 0

              // Risco local: quanto da demanda no lead time não é coberta pelo estoque acima do PRD
              const demandaNoLead = consumoMedio * leadTime
              const estoqueUtil = Math.max(estoque - pontoRessuprimento, 0)
              let riscoCalculado = 0

              if (consumoMedio <= 0) {
                riscoCalculado = estoque <= pontoRessuprimento ? 30 : 0
              } else {
                const deficit = demandaNoLead - estoqueUtil
                // Se houver déficit, risco proporcional; se não, risco baixo
                riscoCalculado = deficit > 0
                  ? Math.min(100, (deficit / Math.max(demandaNoLead, 1)) * 100)
                  : Math.max(0, 20 - diasRestantes)
              }

              // Estoque zerado sempre máximo
              if (estoque <= 0) riscoCalculado = 100

              // Tentar usar RPC se existir, senão seguir com cálculo local
              const { data: risco, error: err12 } = await supabase.rpc(
                "calcular_risco_ruptura",
                {
                  p_profile_id: userId,
                  p_ferramenta_id: f.id,
                }
              )
              const scoreRpc = err12 ? undefined : Number(risco)
              // Usa o maior entre RPC e cálculo local para ser conservador
              const scoreFinal = Math.min(
                100,
                Math.max(
                  riscoCalculado,
                  Number.isFinite(scoreRpc || 0) ? (scoreRpc as number) : 0
                )
              )

              return {
                id: f.id,
                nome: f.nome,
                score: scoreFinal,
                consumo_medio_diario: consumoMedio,
                lead_time: leadTime,
                estoque_atual: estoque,
                dias_restantes: diasRestantes,
                ponto_ressuprimento: pontoRessuprimento,
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
              quantidade_unidades: f.quantidade_unidades,
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
            // Totais para os cards do dashboard
            totais: {
              colaboradores: colaboradores.length,
              ferramentas: ferramentas
                .filter((f: any) => f.tipo_item === "ferramenta")
                .reduce((acc: number, f: any) => acc + (f.quantidade_total || 0), 0), // Soma unidades, não itens
              itensEstoque: ferramentas.length,
              consumiveis: ferramentas.filter((f: any) => f.tipo_item === "consumivel").length,
              epis: ferramentas.filter((f: any) => f.tipo_item === "epi").length,
            },
            totalFerramentasEmUso: totalFerramentasEmUso,
            totalFerramentasEstragadas: ferramentasEstragadas.reduce(
              (acc: number, f: any) => acc + (f?.quantidade_unidades || 0),
              0
            ),
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
