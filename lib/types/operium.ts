/**
 * OPERIUM - Sistema de Controle de Acesso Operacional
 * Types para o módulo de acesso baseado em papéis
 */

// ============================================================================
// ENUMS
// ============================================================================

export type OperiumRole = 'ADMIN' | 'FIELD' | 'WAREHOUSE'

export type OperiumEventType =
    | 'VEHICLE_EXPENSE'
    | 'ITEM_IN'
    | 'ITEM_OUT'
    | 'VEHICLE_STATUS'

export type OperiumVehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'

// ============================================================================
// ENTITIES
// ============================================================================

export interface OperiumProfile {
    user_id: string
    org_id: string
    role: OperiumRole
    active: boolean
    created_at: string
    name?: string
    team_id?: string | null  // Link to teams table when user is assigned to a team
}

export interface OperiumVehicle {
    id: string
    org_id: string
    plate: string
    model?: string
    status: OperiumVehicleStatus
    created_at: string
}

export interface OperiumInventoryItem {
    id: string
    org_id: string
    name: string
    quantity: number
    created_at: string
}

export interface OperiumEvent {
    id: string
    org_id: string
    type: OperiumEventType
    actor_user_id: string
    target_id: string
    metadata: OperiumEventMetadata
    created_at: string
}

// ============================================================================
// METADATA TYPES (para cada tipo de evento)
// ============================================================================

export interface VehicleExpenseMetadata {
    valor: number
    tipo: 'combustivel' | 'manutencao' | 'pedagio' | 'estacionamento' | 'outros'
    foto_nf?: string
    observacoes?: string
}

export interface VehicleStatusMetadata {
    status_anterior?: OperiumVehicleStatus
    status_novo: OperiumVehicleStatus
    observacoes?: string
}

export interface ItemInMetadata {
    quantidade: number
    fornecedor?: string
    nf?: string
    observacoes?: string
}

export interface ItemOutMetadata {
    quantidade: number
    colaborador_id?: string
    colaborador_nome?: string
    motivo?: string
    observacoes?: string
}

export type OperiumEventMetadata =
    | VehicleExpenseMetadata
    | VehicleStatusMetadata
    | ItemInMetadata
    | ItemOutMetadata
    | Record<string, unknown>

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CreateVehicleExpenseInput {
    vehicle_id: string
    valor: number
    tipo: VehicleExpenseMetadata['tipo']
    observacoes?: string
    receipt_url?: string
}

export interface CreateVehicleStatusInput {
    vehicle_id: string
    status: OperiumVehicleStatus
    observacoes?: string
}

export interface CreateItemMovementInput {
    item_id: string
    type: 'ITEM_IN' | 'ITEM_OUT'
    quantidade: number
    colaborador_id?: string
    fornecedor?: string
    observacoes?: string
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

export const ROLE_PERMISSIONS = {
    ADMIN: {
        canCreateAnyEvent: true,
        canManageProfiles: true,
        canManageVehicles: true,
        canManageInventory: true,
    },
    FIELD: {
        canCreateAnyEvent: false,
        canCreateVehicleExpense: true,
        canCreateVehicleStatus: true,
        canManageProfiles: false,
        canManageVehicles: false,
        canManageInventory: false,
    },
    WAREHOUSE: {
        canCreateAnyEvent: false,
        canCreateItemIn: true,
        canCreateItemOut: true,
        canManageProfiles: false,
        canManageVehicles: false,
        canManageInventory: false,
    },
} as const

export function canCreateEventType(role: OperiumRole, eventType: OperiumEventType): boolean {
    if (role === 'ADMIN') return true

    if (role === 'FIELD') {
        return eventType === 'VEHICLE_EXPENSE' || eventType === 'VEHICLE_STATUS'
    }

    if (role === 'WAREHOUSE') {
        return eventType === 'ITEM_IN' || eventType === 'ITEM_OUT'
    }

    return false
}
