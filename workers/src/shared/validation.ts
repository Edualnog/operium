/**
 * ============================================================================
 * TELEMETRY EVENT VALIDATION - CLOUDFLARE WORKERS
 * ============================================================================
 * Validação de eventos de telemetria
 * ============================================================================
 */

import type { TelemetryEventV1, EntityType } from './types';

/**
 * Erro de validação customizado
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Tipos de entidade válidos
 */
const VALID_ENTITY_TYPES: EntityType[] = [
  'tool',
  'asset',
  'vehicle',
  'collaborator',
  'inventory',
  'movement',
  'maintenance',
  'repair',
  'cost',
  'team',
  'generic',
];

/**
 * Fontes de evento válidas
 */
const VALID_SOURCES = ['backend', 'frontend', 'mobile'] as const;

/**
 * Regex para validar UUID v4
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Regex para validar timestamp ISO 8601
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Valida se uma string é um timestamp ISO válido
 */
export function isValidISODate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_REGEX.test(value);
}

/**
 * Valida um evento de telemetria completo
 * @throws ValidationError se o evento for inválido
 */
export function validateEvent(event: unknown): asserts event is TelemetryEventV1 {
  if (!event || typeof event !== 'object') {
    throw new ValidationError('Event must be an object');
  }

  const e = event as Record<string, unknown>;

  // event_id - obrigatório, UUID
  if (!isValidUUID(e.event_id)) {
    throw new ValidationError('event_id must be a valid UUID');
  }

  // ts - obrigatório, ISO 8601
  if (!isValidISODate(e.ts)) {
    throw new ValidationError('ts must be a valid ISO 8601 timestamp');
  }

  // profile_id - obrigatório, UUID
  if (!isValidUUID(e.profile_id)) {
    throw new ValidationError('profile_id must be a valid UUID');
  }

  // org_id - opcional, mas se presente deve ser UUID
  if (e.org_id !== undefined && !isValidUUID(e.org_id)) {
    throw new ValidationError('org_id must be a valid UUID if provided');
  }

  // actor_id - opcional, mas se presente deve ser UUID
  if (e.actor_id !== undefined && !isValidUUID(e.actor_id)) {
    throw new ValidationError('actor_id must be a valid UUID if provided');
  }

  // entity_type - obrigatório, deve ser um tipo válido
  if (!VALID_ENTITY_TYPES.includes(e.entity_type as EntityType)) {
    throw new ValidationError(`entity_type must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
  }

  // entity_id - opcional, mas se presente deve ser UUID
  if (e.entity_id !== undefined && !isValidUUID(e.entity_id)) {
    throw new ValidationError('entity_id must be a valid UUID if provided');
  }

  // event_name - obrigatório, string não vazia
  if (typeof e.event_name !== 'string' || e.event_name.length === 0) {
    throw new ValidationError('event_name is required and must be a non-empty string');
  }

  // event_version - obrigatório, deve ser 1
  if (e.event_version !== 1) {
    throw new ValidationError('event_version must be 1');
  }

  // source - obrigatório, deve ser válido
  if (!VALID_SOURCES.includes(e.source as (typeof VALID_SOURCES)[number])) {
    throw new ValidationError(`source must be one of: ${VALID_SOURCES.join(', ')}`);
  }

  // context - deve ser um objeto se presente
  if (e.context !== undefined && (typeof e.context !== 'object' || e.context === null)) {
    throw new ValidationError('context must be an object if provided');
  }

  // props - deve ser um objeto se presente
  if (e.props !== undefined && (typeof e.props !== 'object' || e.props === null)) {
    throw new ValidationError('props must be an object if provided');
  }

  // privacy - deve ser um objeto com contains_pii boolean
  if (e.privacy !== undefined) {
    if (typeof e.privacy !== 'object' || e.privacy === null) {
      throw new ValidationError('privacy must be an object if provided');
    }
    const privacy = e.privacy as Record<string, unknown>;
    if (typeof privacy.contains_pii !== 'boolean') {
      throw new ValidationError('privacy.contains_pii must be a boolean');
    }
  }
}

/**
 * Valida campos mínimos para ingestão rápida
 * Menos rigoroso que validateEvent, para performance
 */
export function validateMinimalFields(event: unknown): boolean {
  if (!event || typeof event !== 'object') return false;

  const e = event as Record<string, unknown>;

  return (
    isValidUUID(e.event_id) &&
    isValidISODate(e.ts) &&
    isValidUUID(e.profile_id) &&
    typeof e.event_name === 'string' &&
    e.event_name.length > 0 &&
    e.event_version === 1
  );
}
