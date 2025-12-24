/**
 * ============================================================================
 * DOMAIN EVENTS - CONSTANTS & TYPES
 * ============================================================================
 * 
 * Definições centralizadas para o sistema de eventos de domínio.
 * Todas as inserções em domain_events DEVEM usar estes enums.
 * 
 * DATA MOAT STRATEGY:
 * ------------------
 * Este schema já suporta agregação futura cross-tenant, mas atualmente opera
 * em modo "quiet accumulation" - coletando dados de forma estruturada sem
 * expor funcionalidades de analytics cross-tenant ainda.
 * 
 * Os dados acumulados serão valiosos para:
 * - Benchmarks de indústria (após anonimização)
 * - Detecção de anomalias em escala
 * - ML para predição de manutenção
 * - Insights comparativos (sua empresa vs média do setor)
 * 
 * TODO: Implementar pipeline de agregação global quando volume justificar
 * TODO: Criar dashboard de benchmarks (após 1000+ eventos por tipo)
 * TODO: Integrar com sistema de ML para detecção de padrões
 * ============================================================================
 */

// ============================================================================
// ENTITY TYPES - Tipos de entidades que geram eventos
// ============================================================================
// Deve corresponder ao CHECK constraint em domain_events.entity_type

export const ENTITY_TYPES = {
    TOOL: 'tool',
    ASSET: 'asset',
    VEHICLE: 'vehicle',
    COLLABORATOR: 'collaborator',
    INVENTORY: 'inventory',
    PRODUCT: 'product',
    MOVEMENT: 'movement',
    REPAIR: 'repair',
    MAINTENANCE: 'maintenance',
    COST: 'cost',
    GENERIC: 'generic',
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

// Array para validação runtime
export const VALID_ENTITY_TYPES: EntityType[] = Object.values(ENTITY_TYPES);

// ============================================================================
// EVENT SOURCES - Origem dos eventos
// ============================================================================
// Deve corresponder ao CHECK constraint em domain_events.event_source

export const EVENT_SOURCES = {
    SYSTEM: 'system',       // Gerado automaticamente pelo sistema
    USER: 'user',           // Ação direta do usuário
    AUTOMATION: 'automation', // Gerado por automação/trigger
    IMPORT: 'import',       // Importação de dados
    MIGRATION: 'migration', // Migração de dados históricos
} as const;

export type EventSource = typeof EVENT_SOURCES[keyof typeof EVENT_SOURCES];

export const VALID_EVENT_SOURCES: EventSource[] = Object.values(EVENT_SOURCES);

// ============================================================================
// EVENT TYPES - Tipos de eventos por entity_type
// ============================================================================
// Convenção: {ENTITY}_{ACTION} em SCREAMING_SNAKE_CASE

export const EVENT_TYPES = {
    // Tool events
    TOOL_ASSIGNED: 'TOOL_ASSIGNED',
    TOOL_RETURNED: 'TOOL_RETURNED',
    TOOL_DAMAGED: 'TOOL_DAMAGED',
    TOOL_REPAIRED: 'TOOL_REPAIRED',
    TOOL_LOST: 'TOOL_LOST',
    TOOL_CREATED: 'TOOL_CREATED',
    TOOL_UPDATED: 'TOOL_UPDATED',
    TOOL_DELETED: 'TOOL_DELETED',

    // Vehicle events
    VEHICLE_ASSIGNED: 'VEHICLE_ASSIGNED',
    VEHICLE_RETURNED: 'VEHICLE_RETURNED',
    VEHICLE_TRIP: 'VEHICLE_TRIP',
    VEHICLE_USAGE: 'VEHICLE_USAGE',
    VEHICLE_CREATED: 'VEHICLE_CREATED',
    VEHICLE_UPDATED: 'VEHICLE_UPDATED',

    // Maintenance events
    MAINTENANCE_PREVENTIVE: 'MAINTENANCE_PREVENTIVE',
    MAINTENANCE_CORRECTIVE: 'MAINTENANCE_CORRECTIVE',
    MAINTENANCE_PREDICTIVE: 'MAINTENANCE_PREDICTIVE',
    MAINTENANCE_OTHER: 'MAINTENANCE_OTHER',
    MAINTENANCE_SCHEDULED: 'MAINTENANCE_SCHEDULED',
    MAINTENANCE_COMPLETED: 'MAINTENANCE_COMPLETED',

    // Cost events
    VEHICLE_COST_FUEL: 'VEHICLE_COST_fuel',
    VEHICLE_COST_MAINTENANCE: 'VEHICLE_COST_maintenance',
    VEHICLE_COST_INSURANCE: 'VEHICLE_COST_insurance',
    VEHICLE_COST_TAX: 'VEHICLE_COST_tax',
    VEHICLE_COST_OTHER: 'VEHICLE_COST_other',

    // Collaborator events
    COLLABORATOR_CREATED: 'COLLABORATOR_CREATED',
    COLLABORATOR_UPDATED: 'COLLABORATOR_UPDATED',
    COLLABORATOR_PROMOTED: 'COLLABORATOR_PROMOTED',
    COLLABORATOR_TERMINATED: 'COLLABORATOR_TERMINATED',

    // Movement events
    MOVEMENT_CHECKOUT: 'MOVEMENT_CHECKOUT',
    MOVEMENT_CHECKIN: 'MOVEMENT_CHECKIN',
    MOVEMENT_TRANSFER: 'MOVEMENT_TRANSFER',

    // Inventory events
    INVENTORY_ADJUSTED: 'INVENTORY_ADJUSTED',
    INVENTORY_COUNTED: 'INVENTORY_COUNTED',

    // Behavioral/Derived events (automation-generated)
    REPEATED_LATE_RETURN_PATTERN: 'REPEATED_LATE_RETURN_PATTERN',
    EXPECTED_ACTION_NOT_TAKEN: 'EXPECTED_ACTION_NOT_TAKEN',
    PROCESS_DEVIATION_DETECTED: 'PROCESS_DEVIATION_DETECTED',
    OPERATIONAL_FRICTION_SIGNAL: 'OPERATIONAL_FRICTION_SIGNAL',

    // Generic events
    GENERIC_NOTE: 'GENERIC_NOTE',
    GENERIC_ALERT: 'GENERIC_ALERT',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES] | string; // Allow custom types

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Valida se entity_type é válido
 */
export function isValidEntityType(value: unknown): value is EntityType {
    return typeof value === 'string' && VALID_ENTITY_TYPES.includes(value as EntityType);
}

/**
 * Valida se event_source é válido
 */
export function isValidEventSource(value: unknown): value is EventSource {
    return typeof value === 'string' && VALID_EVENT_SOURCES.includes(value as EventSource);
}

/**
 * Valida se payload é um objeto JSON válido (não array, não null, não string)
 */
export function isValidPayload(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

/**
 * Sanitiza payload para garantir que é um objeto válido
 */
export function sanitizePayload(value: unknown): Record<string, unknown> {
    if (isValidPayload(value)) return value;

    // Se for null/undefined, retorna objeto vazio
    if (value == null) return {};

    // Se for array ou string, wrappa em objeto
    if (Array.isArray(value)) return { items: value };
    if (typeof value === 'string') return { message: value };
    if (typeof value === 'number') return { value };
    if (typeof value === 'boolean') return { flag: value };

    // Fallback
    return { raw: String(value) };
}

// ============================================================================
// DOMAIN EVENT INTERFACE
// ============================================================================

export interface DomainEventInput {
    profile_id: string;
    entity_type: EntityType;
    entity_id?: string;
    event_type: string;
    event_source?: EventSource;
    payload?: Record<string, unknown>;
    occurred_at?: Date; // Se não fornecido, o banco usa NOW()
}

/**
 * Prepara um evento para inserção no banco
 * - Valida entity_type e event_source
 * - Sanitiza payload
 * - NÃO define occurred_at (deixa o banco usar NOW())
 */
export function prepareEventForInsert(input: DomainEventInput): {
    profile_id: string;
    entity_type: EntityType;
    entity_id: string | null;
    event_type: string;
    event_source: EventSource;
    payload: Record<string, unknown>;
    occurred_at?: string;
} {
    // Validate entity_type
    if (!isValidEntityType(input.entity_type)) {
        throw new Error(`Invalid entity_type: ${input.entity_type}. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }

    // Validate event_source if provided
    const eventSource = input.event_source || EVENT_SOURCES.SYSTEM;
    if (!isValidEventSource(eventSource)) {
        throw new Error(`Invalid event_source: ${eventSource}. Must be one of: ${VALID_EVENT_SOURCES.join(', ')}`);
    }

    return {
        profile_id: input.profile_id,
        entity_type: input.entity_type,
        entity_id: input.entity_id || null,
        event_type: input.event_type.toUpperCase(), // Normalize to uppercase
        event_source: eventSource,
        payload: sanitizePayload(input.payload),
        // occurred_at: deixa undefined para usar NOW() do banco
        ...(input.occurred_at && { occurred_at: input.occurred_at.toISOString() }),
    };
}

// ============================================================================
// FUTURE DATA MOAT NOTES
// ============================================================================
/**
 * TODO (Data Moat - Phase 2):
 * -------------------------
 * 
 * 1. AGGREGATION PIPELINE
 *    - Criar job scheduled para agregar métricas cross-tenant
 *    - Usar prefixo "benchmark_" para métricas globais
 *    - Anonimizar profile_id em agregações
 * 
 * 2. BENCHMARK METRICS
 *    - avg_tool_checkout_duration (por indústria)
 *    - avg_vehicle_cost_per_km (por tipo de veículo)
 *    - maintenance_frequency_by_asset_age
 *    - tool_loss_rate_by_category
 * 
 * 3. PREDICTIVE ML
 *    - Treinar modelo com eventos históricos
 *    - Predizer manutenção antes de falha
 *    - Identificar colaboradores de alto risco
 * 
 * 4. COMPETITIVE INSIGHTS
 *    - "Sua frota gasta 15% menos que média do setor"
 *    - "Tempo médio sem ferramenta: 2h (média: 4h)"
 * 
 * IMPORTANTE: Essas funcionalidades requerem:
 * - Volume mínimo de eventos (>10k por tipo)
 * - Jobs de agregação scheduled
 * - UI de benchmarks
 * - Política de privacidade atualizada
 */
