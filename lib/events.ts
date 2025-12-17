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
        // Em server actions, await é necessário, mas não blocante de UX se tratado corretamente.

        await supabaseClient.from('events.stream').insert({
            event_type: eventType,
            legacy_ferramenta_id: assetId, // Usando coluna legada por enquanto
            payload: payload,
            occurred_at: new Date().toISOString(),
            actor_id: meta?.actor_id
            // org_id e meta_industry seriam preenchidos aqui se disponíveis no contexto
        })
    } catch (error) {
        // Fail Silently: O evento não pode quebrar a operação do usuário
        console.error('SILENT_EVENT_ERROR:', error)
    }
}
