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

        // 1. FERRAMENTAS EM USO AGORA
        // Verificar se os campos novos existem
        const { data: retiradas, error: err1 } = await supabase
          .from("movimentacoes")
          .select(`
            id,
            ferramenta_id,
            colaborador_id,
            data,
            ferramentas(nome),
            colaboradores(nome)
          `)
          .eq("profile_id", userId)
          .eq("tipo", "retirada")

        if (err1) throw err1

        // Buscar devoluções para identificar quais ainda estão em uso
        const { data: devolucoes, error: err2 } = await supabase
          .from("movimentacoes")
          .select("ferramenta_id, colaborador_id, data")
          .eq("profile_id", userId)
          .eq("tipo", "devolucao")

        if (err2) throw err2

        // Filtrar ferramentas ainda em uso (retiradas sem devolução correspondente)
        const ferramentasEmUso = (retiradas || [])
          .filter((ret) => {
            const foiDevolvida = devolucoes?.some(
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
            const diasEmUso = Math.floor(
              (agora.getTime() - saida.getTime()) / (1000 * 60 * 60 * 24)
            )

            return {
              id: ret.id,
              nome: (ret.ferramentas as any)?.nome || "Desconhecida",
              colaborador: (ret.colaboradores as any)?.nome || "Sem colaborador",
              saida_at: ret.data || "",
              prazo_devolucao: undefined,
              dias_em_uso: diasEmUso,
            }
          })

        // 2. TEMPO MÉDIO DE RETORNO (TMR)
        // Tentar usar função SQL, se não existir, calcular manualmente
        let horasTMR = 0
        const { data: tmrData, error: err3 } = await supabase.rpc(
          "calcular_tmr",
          { p_profile_id: userId }
        )

        if (err3) {
          // Calcular manualmente se função não existir
          const { data: movimentacoesTMR } = await supabase
            .from("movimentacoes")
            .select("data, tipo, ferramenta_id, colaborador_id")
            .eq("profile_id", userId)
            .in("tipo", ["retirada", "devolucao"])
            .order("data", { ascending: true })

          if (movimentacoesTMR) {
            const tempos: number[] = []
            const retiradasMap = new Map<string, any>()

            movimentacoesTMR.forEach((mov: any) => {
              const key = `${mov.ferramenta_id}-${mov.colaborador_id}`
              if (mov.tipo === "retirada") {
                retiradasMap.set(key, mov.data)
              } else if (mov.tipo === "devolucao" && retiradasMap.has(key)) {
                const saida = new Date(retiradasMap.get(key))
                const devolucao = new Date(mov.data)
                const horas = (devolucao.getTime() - saida.getTime()) / (1000 * 60 * 60)
                if (horas > 0) {
                  tempos.push(horas)
                }
                retiradasMap.delete(key)
              }
            })

            horasTMR = tempos.length > 0
              ? tempos.reduce((acc, t) => acc + t, 0) / tempos.length
              : 0
          }
        } else {
          horasTMR = Number(tmrData) || 0
        }
        const tempoMedioRetorno = {
          horas: Math.round(horasTMR * 10) / 10,
          dias: Math.round((horasTMR / 24) * 10) / 10,
          minutos: Math.round(horasTMR * 60),
        }

        // 3. ÍNDICE DE ATRASO DE DEVOLUÇÃO
        // Tentar usar função SQL, se não existir, retornar 0
        let indiceAtraso = 0
        const { data: indiceAtrasoData, error: err4 } = await supabase.rpc(
          "calcular_indice_atraso",
          { p_profile_id: userId }
        )

        if (err4) {
          // Se função não existir, retornar 0 (sem dados de prazo ainda)
          indiceAtraso = 0
        } else {
          indiceAtraso = Number(indiceAtrasoData) || 0
        }

        // 4. TOP FERRAMENTAS MAIS UTILIZADAS (30 dias)
        const { data: movimentacoes30d, error: err5 } = await supabase
          .from("movimentacoes")
          .select("ferramenta_id, quantidade, ferramentas(nome, categoria)")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", trintaDiasAtras.toISOString())

        if (err5) throw err5

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

        // 5. RANKING DE RESPONSABILIDADE DOS COLABORADORES
        const { data: colaboradores, error: err6 } = await supabase
          .from("colaboradores")
          .select("id, nome")
          .eq("profile_id", userId)

        if (err6) throw err6

        const rankingResponsabilidade = await Promise.all(
          (colaboradores || []).map(async (colab) => {
            // Tentar usar função SQL, se não existir, calcular manualmente
            let score = 0
            const { data: scoreData, error: err7 } = await supabase.rpc(
              "calcular_score_responsabilidade",
              {
                p_profile_id: userId,
                p_colaborador_id: colab.id,
              }
            )

            if (err7) {
              // Calcular manualmente: contar retiradas e devoluções
              const { data: retiradasColab } = await supabase
                .from("movimentacoes")
                .select("id, data, ferramenta_id")
                .eq("profile_id", userId)
                .eq("colaborador_id", colab.id)
                .eq("tipo", "retirada")

              const { data: devolucoesColab } = await supabase
                .from("movimentacoes")
                .select("id, data, ferramenta_id")
                .eq("profile_id", userId)
                .eq("colaborador_id", colab.id)
                .eq("tipo", "devolucao")

              const totalRetiradas = retiradasColab?.length || 0
              const totalDevolucoes = devolucoesColab?.length || 0
              
              // Score simples: devoluções / retiradas * 100
              score = totalRetiradas > 0 ? (totalDevolucoes / totalRetiradas) * 100 : 0
            } else {
              score = Number(scoreData) || 0
            }

            const { data: retiradasColab } = await supabase
              .from("movimentacoes")
              .select("id")
              .eq("profile_id", userId)
              .eq("colaborador_id", colab.id)
              .eq("tipo", "retirada")

            return {
              colaborador_id: colab.id,
              nome: colab.nome,
              score: score,
              total_retiradas: retiradasColab?.length || 0,
              devolucoes_no_prazo: Math.round(
                (score / 100) * (retiradasColab?.length || 0)
              ),
            }
          })
        )

        // 6. CONSUMO MÉDIO DIÁRIO (Consumíveis - últimos 30 dias)
        const { data: consumiveisMov, error: err8 } = await supabase
          .from("movimentacoes")
          .select("ferramenta_id, quantidade, data, ferramentas(tipo_item, nome, categoria)")
          .eq("profile_id", userId)
          .eq("tipo", "retirada")
          .gte("data", trintaDiasAtras.toISOString())

        if (err8) throw err8

        const consumiveis = consumiveisMov?.filter(
          (m) => (m.ferramentas as any)?.tipo_item === "consumivel"
        ) || []

        const totalConsumo = consumiveis.reduce(
          (acc, m) => acc + (m.quantidade || 0),
          0
        )
        const consumoMedioDiario = totalConsumo / 30

        // 7. ITENS COM ESTOQUE CRÍTICO
        const { data: ferramentas, error: err9 } = await supabase
          .from("ferramentas")
          .select("id, nome, quantidade_disponivel, ponto_ressuprimento, categoria, tipo_item, lead_time_dias")
          .eq("profile_id", userId)

        if (err9) throw err9

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

        // 9. EPIs ATIVOS POR COLABORADOR
        const { data: episMov, error: err10 } = await supabase
          .from("movimentacoes")
          .select(`
            colaborador_id,
            ferramenta_id,
            tipo,
            colaboradores(nome),
            ferramentas(nome, tipo_item, validade)
          `)
          .eq("profile_id", userId)
          .in("tipo", ["retirada", "devolucao"])

        if (err10) throw err10

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
        const { data: epis, error: err11 } = await supabase
          .from("ferramentas")
          .select("id, nome, validade")
          .eq("profile_id", userId)
          .eq("tipo_item", "epi")
          .not("validade", "is", null)

        if (err11) throw err11

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
            tempoMedioRetorno,
            indiceAtrasoDevolucao: Number(indiceAtraso) || 0,
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

