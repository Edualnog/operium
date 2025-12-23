/**
 * ============================================================================
 * DOMAIN EVENTS - TRACKING SERVICE
 * ============================================================================
 * 
 * Serviço centralizado para rastrear eventos de domínio.
 * Todas as inserções em domain_events devem passar por aqui.
 * 
 * IMPORTANTE: Este serviço opera em modo "fire and forget" - erros de
 * tracking NUNCA devem bloquear a operação do usuário.
 * 
 * MODO ATUAL: "Quiet Accumulation"
 * ---------------------------------
 * Estamos coletando eventos de forma estruturada, mas ainda não
 * processando agregações cross-tenant. Os dados estão sendo acumulados
 * para formar um data moat valioso no futuro.
 * ============================================================================
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
    EntityType,
    EventSource,
    EventType,
    EVENT_SOURCES,
    ENTITY_TYPES,
    EVENT_TYPES,
    prepareEventForInsert,
    isValidPayload,
    sanitizePayload,
} from '../constants/domain-events';

// ============================================================================
// TYPES
// ============================================================================

interface TrackEventOptions {
    /**
     * ID do profile (organização)
     */
    profileId: string;

    /**
     * Tipo da entidade que gerou o evento
     */
    entityType: EntityType;

    /**
     * ID da entidade específica (opcional para eventos genéricos)
     */
    entityId?: string;

    /**
     * Tipo do evento (use EVENT_TYPES quando possível)
     */
    eventType: EventType | string;

    /**
     * Origem do evento (default: 'user')
     */
    eventSource?: EventSource;

    /**
     * Dados adicionais do evento (deve ser um objeto, não array/string)
     */
    payload?: Record<string, unknown>;

    /**
     * Data real do evento (default: agora)
     * ATENÇÃO: Use apenas se o evento realmente ocorreu no passado
     */
    occurredAt?: Date;
}

interface TrackResult {
    success: boolean;
    eventId?: string;
    error?: string;
}

// ============================================================================
// MAIN TRACKING FUNCTION
// ============================================================================

/**
 * Rastreia um evento de domínio de forma segura.
 * 
 * - Valida todos os campos antes de inserir
 * - Sanitiza payload automaticamente
 * - Opera em modo fire-and-forget (não bloqueia)
 * - Loga erros mas nunca propaga exceções
 * 
 * @example
 * ```ts
 * await trackDomainEvent(supabase, {
 *     profileId: user.id,
 *     entityType: ENTITY_TYPES.TOOL,
 *     entityId: toolId,
 *     eventType: EVENT_TYPES.TOOL_ASSIGNED,
 *     payload: { collaborator_id: colabId, expected_return: '2024-01-15' }
 * });
 * ```
 */
export async function trackDomainEvent(
    supabase: SupabaseClient,
    options: TrackEventOptions
): Promise<TrackResult> {
    try {
        // Prepare and validate event
        const eventData = prepareEventForInsert({
            profile_id: options.profileId,
            entity_type: options.entityType,
            entity_id: options.entityId,
            event_type: options.eventType,
            event_source: options.eventSource || EVENT_SOURCES.USER,
            payload: options.payload,
            occurred_at: options.occurredAt,
        });

        // Insert event
        const { data, error } = await supabase
            .from('domain_events')
            .insert(eventData)
            .select('id')
            .single();

        if (error) {
            // Log but don't throw - tracking should never break the app
            console.error('[DOMAIN_EVENT_ERROR]', {
                error: error.message,
                event_type: options.eventType,
                entity_type: options.entityType,
            });
            return { success: false, error: error.message };
        }

        return { success: true, eventId: data?.id };

    } catch (err: any) {
        // Fail silently - event tracking should NEVER break user operations
        console.error('[DOMAIN_EVENT_EXCEPTION]', {
            message: err.message,
            event_type: options.eventType,
        });
        return { success: false, error: err.message };
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS - PRE-CONFIGURED EVENT TRACKERS
// ============================================================================

/**
 * Rastreia evento de ferramenta
 */
export async function trackToolEvent(
    supabase: SupabaseClient,
    profileId: string,
    toolId: string,
    eventType: typeof EVENT_TYPES.TOOL_ASSIGNED | typeof EVENT_TYPES.TOOL_RETURNED | typeof EVENT_TYPES.TOOL_DAMAGED | string,
    payload?: Record<string, unknown>
): Promise<TrackResult> {
    return trackDomainEvent(supabase, {
        profileId,
        entityType: ENTITY_TYPES.TOOL,
        entityId: toolId,
        eventType,
        payload,
    });
}

/**
 * Rastreia evento de veículo
 */
export async function trackVehicleEvent(
    supabase: SupabaseClient,
    profileId: string,
    vehicleId: string,
    eventType: typeof EVENT_TYPES.VEHICLE_ASSIGNED | typeof EVENT_TYPES.VEHICLE_RETURNED | string,
    payload?: Record<string, unknown>
): Promise<TrackResult> {
    return trackDomainEvent(supabase, {
        profileId,
        entityType: ENTITY_TYPES.VEHICLE,
        entityId: vehicleId,
        eventType,
        payload,
    });
}

/**
 * Rastreia evento de movimentação
 */
export async function trackMovementEvent(
    supabase: SupabaseClient,
    profileId: string,
    movementId: string,
    eventType: typeof EVENT_TYPES.MOVEMENT_CHECKOUT | typeof EVENT_TYPES.MOVEMENT_CHECKIN | string,
    payload?: Record<string, unknown>
): Promise<TrackResult> {
    return trackDomainEvent(supabase, {
        profileId,
        entityType: ENTITY_TYPES.MOVEMENT,
        entityId: movementId,
        eventType,
        payload,
    });
}

/**
 * Rastreia evento de manutenção
 */
export async function trackMaintenanceEvent(
    supabase: SupabaseClient,
    profileId: string,
    maintenanceId: string,
    eventType: typeof EVENT_TYPES.MAINTENANCE_COMPLETED | typeof EVENT_TYPES.MAINTENANCE_SCHEDULED | string,
    payload?: Record<string, unknown>
): Promise<TrackResult> {
    return trackDomainEvent(supabase, {
        profileId,
        entityType: ENTITY_TYPES.MAINTENANCE,
        entityId: maintenanceId,
        eventType,
        payload,
    });
}

// ============================================================================
// RE-EXPORT CONSTANTS FOR CONVENIENCE
// ============================================================================
export { ENTITY_TYPES, EVENT_TYPES, EVENT_SOURCES } from '../constants/domain-events';
