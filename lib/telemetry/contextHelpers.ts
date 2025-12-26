/**
 * Helpers de contexto para telemetria comportamental
 * Fornece dados enriquecidos sobre colaboradores, ferramentas e padrões temporais
 */

import { createServerComponentClient } from "@/lib/supabase-server"

// Faixas de experiência baseadas em dias de empresa
const EXPERIENCE_BRACKETS = {
    "0-30d": { min: 0, max: 30 },
    "30-90d": { min: 30, max: 90 },
    "90-180d": { min: 90, max: 180 },
    "180-365d": { min: 180, max: 365 },
    "1-2y": { min: 365, max: 730 },
    "2y+": { min: 730, max: Infinity },
} as const

type ExperienceBracket = keyof typeof EXPERIENCE_BRACKETS

/**
 * Calcula dias desde uma data
 */
function daysSince(dateStr: string | null): number {
    if (!dateStr) return 0
    const date = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Determina faixa de experiência baseado nos dias de empresa
 */
function getExperienceBracket(dias: number): ExperienceBracket {
    for (const [bracket, { min, max }] of Object.entries(EXPERIENCE_BRACKETS)) {
        if (dias >= min && dias < max) {
            return bracket as ExperienceBracket
        }
    }
    return "2y+"
}

/**
 * Retorna contexto temporal do momento atual
 */
export function getTemporalContext() {
    const now = new Date()
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"]

    return {
        hora_dia: now.getHours(),
        dia_semana: diasSemana[now.getDay()],
        semana_mes: Math.ceil(now.getDate() / 7),
        mes: now.getMonth() + 1,
        ano: now.getFullYear(),
        is_fim_semana: now.getDay() === 0 || now.getDay() === 6,
        is_horario_comercial: now.getHours() >= 8 && now.getHours() <= 18,
    }
}

/**
 * Interface para contexto do colaborador
 */
export interface CollaboratorContext {
    colaborador_id: string
    nome: string
    role_function: string | null
    seniority_bucket: string | null
    dias_empresa: number
    faixa_experiencia: ExperienceBracket
    data_admissao: string | null
    total_retiradas: number
    total_devolucoes: number
    taxa_devolucao: number
    total_perdas: number
    total_danos: number
}

/**
 * Busca contexto enriquecido de um colaborador
 */
export async function getCollaboratorContext(
    colaboradorId: string,
    profileId: string
): Promise<CollaboratorContext | null> {
    try {
        const supabase = await createServerComponentClient()

        // Buscar dados do colaborador
        const { data: colaborador } = await supabase
            .from("colaboradores")
            .select("id, nome, role_function, seniority_bucket, data_admissao")
            .eq("id", colaboradorId)
            .eq("profile_id", profileId)
            .single()

        if (!colaborador) return null

        // Calcular dias de empresa
        const diasEmpresa = daysSince(colaborador.data_admissao)

        // Buscar estatísticas de movimentações
        const { data: movimentacoes } = await supabase
            .from("movimentacoes")
            .select("tipo, quantidade")
            .eq("colaborador_id", colaboradorId)
            .eq("profile_id", profileId)

        const stats = (movimentacoes || []).reduce(
            (acc, mov) => {
                if (mov.tipo === "retirada") acc.retiradas += mov.quantidade || 1
                if (mov.tipo === "devolucao") acc.devolucoes += mov.quantidade || 1
                return acc
            },
            { retiradas: 0, devolucoes: 0 }
        )

        return {
            colaborador_id: colaborador.id,
            nome: colaborador.nome,
            role_function: colaborador.role_function,
            seniority_bucket: colaborador.seniority_bucket,
            dias_empresa: diasEmpresa,
            faixa_experiencia: getExperienceBracket(diasEmpresa),
            data_admissao: colaborador.data_admissao,
            total_retiradas: stats.retiradas,
            total_devolucoes: stats.devolucoes,
            taxa_devolucao: stats.retiradas > 0
                ? Math.round((stats.devolucoes / stats.retiradas) * 100)
                : 100,
            total_perdas: 0, // TODO: implementar quando tiver tracking de perdas
            total_danos: 0,  // TODO: implementar quando tiver tracking de danos
        }
    } catch (error) {
        console.error("[TelemetryContext] Erro ao buscar colaborador:", error)
        return null
    }
}

/**
 * Interface para contexto da ferramenta/ativo
 */
export interface ToolContext {
    ferramenta_id: string
    nome: string
    categoria: string | null
    tipo_item: string
    valor_unitario: number
    quantidade_total: number
    quantidade_disponivel: number
    idade_dias: number
    estado: string
}

/**
 * Busca contexto enriquecido de uma ferramenta/ativo
 */
export async function getToolContext(
    ferramentaId: string,
    profileId: string
): Promise<ToolContext | null> {
    try {
        const supabase = await createServerComponentClient()

        const { data: ferramenta } = await supabase
            .from("ferramentas")
            .select("id, nome, categoria, tipo_item, valor_unitario, quantidade_total, quantidade_disponivel, estado, created_at")
            .eq("id", ferramentaId)
            .eq("profile_id", profileId)
            .single()

        if (!ferramenta) return null

        return {
            ferramenta_id: ferramenta.id,
            nome: ferramenta.nome,
            categoria: ferramenta.categoria,
            tipo_item: ferramenta.tipo_item,
            valor_unitario: ferramenta.valor_unitario || 0,
            quantidade_total: ferramenta.quantidade_total,
            quantidade_disponivel: ferramenta.quantidade_disponivel,
            idade_dias: daysSince(ferramenta.created_at),
            estado: ferramenta.estado,
        }
    } catch (error) {
        console.error("[TelemetryContext] Erro ao buscar ferramenta:", error)
        return null
    }
}

/**
 * Calcula tempo de posse em horas e dias
 */
export function getHoldingTime(checkoutDate: string | Date): { horas: number; dias: number } {
    const checkout = new Date(checkoutDate)
    const now = new Date()
    const diffMs = now.getTime() - checkout.getTime()
    const diffHoras = Math.round(diffMs / (1000 * 60 * 60))
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

    return { horas: diffHoras, dias: diffDias }
}
