/**
 * ============================================================================
 * TELEMETRY TYPES - BACKEND (NEXT.JS)
 * ============================================================================
 * Tipos para o cliente de telemetria que envia eventos para Cloudflare Workers.
 * ============================================================================
 */

/**
 * Tipos de entidade suportados
 * Deve estar em sincronia com workers/src/shared/types.ts
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
 * Categorias de dados para classificação de privacidade
 */
export type DataCategory = 'operational' | 'behavioral' | 'financial';

/**
 * Contexto opcional do evento
 */
export interface TelemetryContext {
  /** Fluxo de negócio (ex: 'retirada_ferramenta') */
  flow?: string;

  /** Tela/página de origem */
  screen?: string;

  /** Hash do IP (não o IP real) */
  ip_hash?: string;

  /** Hash do User-Agent (não o UA real) */
  ua_hash?: string;
}

/**
 * Metadados de privacidade
 */
export interface PrivacyInfo {
  /** Se contém PII - DEVE ser false para telemetria */
  contains_pii?: boolean;

  /** Categoria do dado */
  data_category?: DataCategory;
}

/**
 * Input para criar um evento de telemetria
 */
export interface TelemetryEventInput {
  /** UUID da organização (profile_id) - OBRIGATÓRIO */
  profile_id: string;

  /** UUID do usuário que executou a ação */
  actor_id?: string;

  /** Tipo da entidade afetada - OBRIGATÓRIO */
  entity_type: EntityType;

  /** UUID da entidade específica */
  entity_id?: string;

  /** Nome do evento (VERBO_NO_PASSADO) - OBRIGATÓRIO */
  event_name: string;

  /** Payload específico do evento */
  props?: Record<string, unknown>;

  /** Contexto adicional */
  context?: TelemetryContext;

  /** Metadados de privacidade */
  privacy?: PrivacyInfo;
}

/**
 * Evento completo como enviado para Cloudflare
 */
export interface TelemetryEventV1 {
  event_id: string;
  ts: string;
  profile_id: string;
  org_id: string;
  actor_id?: string;
  entity_type: EntityType;
  entity_id?: string;
  event_name: string;
  event_version: 1;
  source: 'backend';
  context: {
    flow?: string;
    screen?: string;
    app_version?: string;
    ip_hash?: string;
    ua_hash?: string;
  };
  props: Record<string, unknown>;
  privacy: {
    contains_pii: boolean;
    data_category?: DataCategory;
  };
}

/**
 * Resposta do endpoint de ingestão
 */
export interface IngestResponse {
  accepted: number;
  rejected: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Configuração do cliente de telemetria
 */
export interface TelemetryConfig {
  /** Se telemetria está habilitada */
  enabled: boolean;

  /** URL do worker de ingestão */
  ingestUrl: string;

  /** Secret para autenticação */
  ingestSecret: string;

  /** Taxa de amostragem (0.0 a 1.0) */
  sampleRate: number;
}
