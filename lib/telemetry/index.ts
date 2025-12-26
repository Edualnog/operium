/**
 * ============================================================================
 * TELEMETRY - CLOUDFLARE WORKERS
 * ============================================================================
 * Exports públicos do módulo de telemetria.
 *
 * Uso:
 * ```ts
 * import { telemetry } from '@/lib/telemetry';
 *
 * // Após sucesso no CRUD
 * telemetry.emit({
 *   profile_id: user.id,
 *   entity_type: 'tool',
 *   entity_id: toolId,
 *   event_name: 'TOOL_CREATED',
 *   props: { nome: 'Furadeira' }
 * });
 * ```
 * ============================================================================
 */

// Client
export {
  telemetry,
  emitRawEvent,
  emitRawEventAsync,
  emitBatch,
} from './telemetryClient';

// Types
export type {
  TelemetryEventInput,
  TelemetryEventV1,
  TelemetryConfig,
  TelemetryContext,
  PrivacyInfo,
  EntityType,
  DataCategory,
  IngestResponse,
} from './types';
