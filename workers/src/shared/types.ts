/**
 * ============================================================================
 * TELEMETRY EVENT TYPES - CLOUDFLARE WORKERS
 * ============================================================================
 * Schema v1 para eventos de telemetria industrial
 * ============================================================================
 */

/**
 * Tipos de entidade suportados
 */
export type EntityType =
  | 'tool'
  | 'asset'
  | 'vehicle'
  | 'collaborator'
  | 'inventory'
  | 'movement'
  | 'maintenance'
  | 'repair'
  | 'cost'
  | 'team'
  | 'generic';

/**
 * Fontes de evento
 */
export type EventSource = 'backend' | 'frontend' | 'mobile';

/**
 * Contexto do evento
 */
export interface EventContext {
  flow?: string;
  screen?: string;
  app_version?: string;
  ip_hash?: string;
  ua_hash?: string;
}

/**
 * Metadados de privacidade
 */
export interface PrivacyMetadata {
  contains_pii: boolean;
  data_category?: 'operational' | 'behavioral' | 'financial';
}

/**
 * Evento de telemetria v1 - Schema principal
 */
export interface TelemetryEventV1 {
  /** UUID único do evento */
  event_id: string;

  /** Timestamp ISO 8601 */
  ts: string;

  /** UUID da organização (profile_id) */
  profile_id: string;

  /** Alias para profile_id (compatibilidade) */
  org_id: string;

  /** UUID do usuário que executou a ação */
  actor_id?: string;

  /** Tipo da entidade afetada */
  entity_type: EntityType;

  /** UUID da entidade específica */
  entity_id?: string;

  /** Nome do evento (VERBO_NO_PASSADO) */
  event_name: string;

  /** Versão do schema */
  event_version: 1;

  /** Origem do evento */
  source: EventSource;

  /** Contexto adicional */
  context: EventContext;

  /** Payload específico do evento */
  props: Record<string, unknown>;

  /** Metadados de privacidade */
  privacy: PrivacyMetadata;
}

/**
 * Evento enriquecido pelo Worker Ingest
 */
export interface EnrichedEvent extends TelemetryEventV1 {
  /** Timestamp de recebimento pelo worker */
  received_at: string;

  /** Região do edge que processou */
  edge_region: string;

  /** Versão do worker que processou */
  ingest_worker_version: string;
}

/**
 * Resposta do endpoint /ingest
 */
export interface IngestResponse {
  /** Quantidade de eventos aceitos */
  accepted: number;

  /** Quantidade de eventos rejeitados */
  rejected: number;

  /** Erros de validação (se houver) */
  errors?: Array<{
    index: number;
    error: string;
  }>;
}
