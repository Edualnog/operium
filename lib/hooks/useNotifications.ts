"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@/lib/supabase-client"

export interface Notification {
  id: string
  tipo: "estoque_critico" | "epi_vencendo" | "devolucao_pendente" | "sistema"
  titulo: string
  mensagem: string
  lida: boolean
  data_criacao: string
  prioridade: "baixa" | "normal" | "alta" | "urgente"
  referencia_id?: string
  referencia_tipo?: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  refreshNotifications: () => Promise<void>
}

export function useNotifications(userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const generateNotifications = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const generatedNotifications: Notification[] = []
      const now = new Date()

      // 1. Buscar itens com estoque crítico
      const { data: ferramentas } = await supabase
        .from("ferramentas")
        .select("id, nome, quantidade_disponivel, ponto_ressuprimento")
        .eq("profile_id", userId)
        .gt("ponto_ressuprimento", 0)

      if (ferramentas) {
        ferramentas.forEach((item) => {
          if (item.quantidade_disponivel < item.ponto_ressuprimento) {
            const deficit = item.ponto_ressuprimento - item.quantidade_disponivel
            generatedNotifications.push({
              id: `estoque-${item.id}`,
              tipo: "estoque_critico",
              titulo: "Estoque Crítico",
              mensagem: `${item.nome} está com apenas ${item.quantidade_disponivel} unidades (mínimo: ${item.ponto_ressuprimento}). Déficit de ${deficit} unidades.`,
              lida: false,
              data_criacao: now.toISOString(),
              prioridade: deficit > 10 ? "urgente" : "alta",
              referencia_id: item.id,
              referencia_tipo: "ferramenta",
            })
          }
        })
      }

      // 2. Buscar EPIs próximos do vencimento (30 dias)
      const trintaDias = new Date()
      trintaDias.setDate(trintaDias.getDate() + 30)

      const { data: episVencendo } = await supabase
        .from("ferramentas")
        .select("id, nome, validade")
        .eq("profile_id", userId)
        .not("validade", "is", null)
        .lte("validade", trintaDias.toISOString())
        .gte("validade", now.toISOString())

      if (episVencendo) {
        episVencendo.forEach((epi) => {
          const validade = new Date(epi.validade)
          const diasRestantes = Math.ceil((validade.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          generatedNotifications.push({
            id: `epi-vencendo-${epi.id}`,
            tipo: "epi_vencendo",
            titulo: "EPI Próximo do Vencimento",
            mensagem: `${epi.nome} vence em ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} (${validade.toLocaleDateString("pt-BR")}).`,
            lida: false,
            data_criacao: now.toISOString(),
            prioridade: diasRestantes <= 7 ? "urgente" : diasRestantes <= 15 ? "alta" : "normal",
            referencia_id: epi.id,
            referencia_tipo: "ferramenta",
          })
        })
      }

      // 3. Buscar EPIs já vencidos
      const { data: episVencidos } = await supabase
        .from("ferramentas")
        .select("id, nome, validade")
        .eq("profile_id", userId)
        .not("validade", "is", null)
        .lt("validade", now.toISOString())

      if (episVencidos) {
        episVencidos.forEach((epi) => {
          const validade = new Date(epi.validade)
          const diasVencido = Math.ceil((now.getTime() - validade.getTime()) / (1000 * 60 * 60 * 24))
          generatedNotifications.push({
            id: `epi-vencido-${epi.id}`,
            tipo: "epi_vencendo",
            titulo: "⚠️ EPI Vencido",
            mensagem: `${epi.nome} está VENCIDO há ${diasVencido} dia${diasVencido !== 1 ? "s" : ""} (${validade.toLocaleDateString("pt-BR")}). Substitua imediatamente!`,
            lida: false,
            data_criacao: now.toISOString(),
            prioridade: "urgente",
            referencia_id: epi.id,
            referencia_tipo: "ferramenta",
          })
        })
      }

      // 4. Buscar devoluções pendentes (itens retirados há mais de 7 dias sem devolução)
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

      const { data: retiradas } = await supabase
        .from("movimentacoes")
        .select(`
          id,
          quantidade,
          data,
          colaboradores(id, nome),
          ferramentas(id, nome, tipo_item)
        `)
        .eq("profile_id", userId)
        .eq("tipo", "retirada")
        .lte("data", seteDiasAtras.toISOString())

      const { data: devolucoes } = await supabase
        .from("movimentacoes")
        .select("colaborador_id, ferramenta_id, quantidade")
        .eq("profile_id", userId)
        .eq("tipo", "devolucao")

      if (retiradas && devolucoes) {
        // Calcular saldo de devoluções por colaborador/ferramenta
        const devolucoesMap = new Map<string, number>()
        devolucoes.forEach((d) => {
          const key = `${d.colaborador_id}-${d.ferramenta_id}`
          devolucoesMap.set(key, (devolucoesMap.get(key) || 0) + d.quantidade)
        })

        const retiradasMap = new Map<string, { total: number; colaborador: any; ferramenta: any; data: string }>()
        retiradas.forEach((r) => {
          if (!r.colaboradores || !r.ferramentas) return
          // Apenas ferramentas (não consumíveis)
          if ((r.ferramentas as any).tipo_item === "consumivel") return

          const key = `${(r.colaboradores as any).id}-${(r.ferramentas as any).id}`
          if (!retiradasMap.has(key)) {
            retiradasMap.set(key, {
              total: 0,
              colaborador: r.colaboradores,
              ferramenta: r.ferramentas,
              data: r.data,
            })
          }
          retiradasMap.get(key)!.total += r.quantidade
        })

        retiradasMap.forEach((retirada, key) => {
          const devolvido = devolucoesMap.get(key) || 0
          const pendente = retirada.total - devolvido

          if (pendente > 0) {
            const dataRetirada = new Date(retirada.data)
            const diasPendente = Math.ceil((now.getTime() - dataRetirada.getTime()) / (1000 * 60 * 60 * 24))

            generatedNotifications.push({
              id: `devolucao-${key}`,
              tipo: "devolucao_pendente",
              titulo: "Devolução Pendente",
              mensagem: `${retirada.colaborador.nome} está com ${pendente} unidade(s) de "${retirada.ferramenta.nome}" há ${diasPendente} dias.`,
              lida: false,
              data_criacao: now.toISOString(),
              prioridade: diasPendente > 30 ? "urgente" : diasPendente > 14 ? "alta" : "normal",
              referencia_id: retirada.colaborador.id,
              referencia_tipo: "colaborador",
            })
          }
        })
      }

      // Ordenar por prioridade e data
      const prioridadeOrdem = { urgente: 0, alta: 1, normal: 2, baixa: 3 }
      generatedNotifications.sort((a, b) => {
        const prioridadeDiff = prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade]
        if (prioridadeDiff !== 0) return prioridadeDiff
        return new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
      })

      // Carregar estado de lidas do localStorage
      const readNotifications = JSON.parse(localStorage.getItem("readNotifications") || "[]")
      const dismissedNotifications = JSON.parse(localStorage.getItem("dismissedNotifications") || "[]")

      const finalNotifications = generatedNotifications
        .filter((n) => !dismissedNotifications.includes(n.id))
        .map((n) => ({
          ...n,
          lida: readNotifications.includes(n.id),
        }))

      setNotifications(finalNotifications)
      setError(null)
    } catch (err: any) {
      console.error("Erro ao gerar notificações:", err)
      setError(err.message || "Erro ao carregar notificações")
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    generateNotifications()

    // Atualizar a cada 5 minutos
    const interval = setInterval(generateNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [generateNotifications])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    )
    const readNotifications = JSON.parse(localStorage.getItem("readNotifications") || "[]")
    if (!readNotifications.includes(id)) {
      localStorage.setItem("readNotifications", JSON.stringify([...readNotifications, id]))
    }
  }, [])

  const markAllAsRead = useCallback(() => {
    // Mark all as read AND dismiss them (clear from UI)
    const allIds = notifications.map((n) => n.id)

    // Add to dismissed list so they don't reappear
    const dismissedNotifications = JSON.parse(localStorage.getItem("dismissedNotifications") || "[]")
    const newDismissed = [...new Set([...dismissedNotifications, ...allIds])]
    localStorage.setItem("dismissedNotifications", JSON.stringify(newDismissed))

    // Also mark as read
    localStorage.setItem("readNotifications", JSON.stringify(allIds))

    // Clear the notifications from state
    setNotifications([])
  }, [notifications])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const dismissedNotifications = JSON.parse(localStorage.getItem("dismissedNotifications") || "[]")
    if (!dismissedNotifications.includes(id)) {
      localStorage.setItem("dismissedNotifications", JSON.stringify([...dismissedNotifications, id]))
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    await generateNotifications()
  }, [generateNotifications])

  const unreadCount = notifications.filter((n) => !n.lida).length

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications,
  }
}

