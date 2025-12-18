import { createClient } from "@supabase/supabase-js"

/**
 * PASSO 2 — 5 Eventos Canônicos
 * Definição estrita dos fatos imutáveis do sistema.
 */

export type CanonicalEventType =
    | 'ASSET_CHECKOUT'    // Retirada
    | 'ASSET_CHECKIN'     // Devolução
    | 'ASSET_INCIDENT'    // Problema/Reporte
    | 'ASSET_MAINTENANCE' // Manutenção
    | 'ASSET_RETIREMENT'  // Descarte/Baixa

interface BaseEventPayload {
    reason_code?: string // Código estruturado do porquê (ex: 'PROJECT_END', 'BROKEN', 'LOST')
    notes?: string       // Texto livre (opcional, secundário)
    quantity_affected?: number // Quantidade afetada pelo evento
}

// 1. CHEKCOUT (Saída)
export interface AssetCheckoutPayload extends BaseEventPayload {
    recipient_id?: string // Quem recebeu (se diferente do actor)
    location_id?: string  // Para onde foi
    expected_return?: string // ISO Date
    project_id?: string
}

// 2. CHECKIN (Entrada/Retorno)
export interface AssetCheckinPayload extends BaseEventPayload {
    usage_duration_minutes?: number // Duração do uso
    condition_grade?: 1 | 2 | 3 | 4 | 5 // Estado no retorno (5=Novo)
    meter_reading?: number // Horímetro/Km
}

// 3. INCIDENT (Problema)
export interface AssetIncidentPayload extends BaseEventPayload {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    breakdown_type?: 'MECHANICAL' | 'ELECTRICAL' | 'misuse' | 'WEAR'
}

// 4. MAINTENANCE (Manutenção)
export interface AssetMaintenancePayload extends BaseEventPayload {
    maintenance_type: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE'
    cost?: number
    service_order_id?: string
}

// 5. RETIREMENT (Descarte)
export interface AssetRetirementPayload extends BaseEventPayload {
    retirement_type: 'SOLD' | 'SCRAPPED' | 'LOST' | 'DONATED'
    salvage_value?: number
}

// Union Type para Safety
export type EventPayload =
    | AssetCheckoutPayload
    | AssetCheckinPayload
    | AssetIncidentPayload
    | AssetMaintenancePayload
    | AssetRetirementPayload

/**
 * PASSO 3 — Conector Silencioso
 * Grava na tabela events.stream sem afetar a UX.
 */
export async function trackEvent(
    supabaseClient: any, // Passar o client autenticado do contexto
    eventType: CanonicalEventType,
    assetId: string, // ID legado ou novo
    payload: EventPayload,
    meta?: {
        actor_id?: string
        org_id?: string
    }
) {
    try {
        // Fire and Forget (não bloqueia a resposta ao usuário)
        // Usamos RPC para garantir segurança (SECURITY DEFINER) e evitar expor o schema events na API

        // Mapeando para os parametros da função SQL criada:
        // p_event_type, p_payload, p_legacy_id

        const { error } = await supabaseClient.rpc('track_event', {
            p_event_type: eventType,
            p_payload: payload,
            p_legacy_id: assetId
        })

        if (error) console.error('EVENT_RPC_ERROR:', error)

    } catch (error) {
        // Fail Silently: O evento não pode quebrar a operação do usuário
        console.error('SILENT_EVENT_ERROR:', error)
    }
}
