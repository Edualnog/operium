/**
 * ============================================================================
 * TELEMETRY CLIENT - CLOUDFLARE WORKERS
 * ============================================================================
 *
 * Cliente fire-and-forget para enviar eventos de telemetria para Cloudflare.
 *
 * REGRAS CRÍTICAS:
 * - NUNCA bloqueia requests
 * - NUNCA lança exceções
 * - Timeout curto (~700ms)
 * - Se falhar, produto continua funcionando
 *
 * Uso:
 * ```ts
 * import { telemetry } from '@/lib/telemetry';
 *
 * // Após sucesso no CRUD
 * telemetry.emit({
 *   profile_id: user.id,
 *   entity_type: 'movement',
 *   entity_id: movement.id,
 *   event_name: 'MOVEMENT_RECORDED',
 *   props: { tipo: 'retirada', quantidade: 2 }
 * });
 * ```
 * ============================================================================
 */

import type {
  TelemetryEventInput,
  TelemetryEventV1,
  TelemetryConfig,
  IngestResponse,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Timeout para requisições de telemetria (ms) */
const TELEMETRY_TIMEOUT_MS = 700;

/** Taxa de amostragem padrão */
const DEFAULT_SAMPLE_RATE = 1.0;

/** Versão do app para contexto */
const APP_VERSION = process.env.npm_package_version || '1.0.0';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Obtém configuração de telemetria das variáveis de ambiente
 */
function getConfig(): TelemetryConfig {
  return {
    enabled: process.env.TELEMETRY_ENABLED === 'true',
    ingestUrl: process.env.CLOUDFLARE_TELEMETRY_INGEST_URL || '',
    ingestSecret: process.env.CLOUDFLARE_TELEMETRY_INGEST_SECRET || '',
    sampleRate: parseFloat(
      process.env.TELEMETRY_SAMPLE_RATE || String(DEFAULT_SAMPLE_RATE)
    ),
  };
}

/**
 * Decide se deve amostrar este evento
 */
function shouldSample(sampleRate: number): boolean {
  return Math.random() < sampleRate;
}

// ============================================================================
// ORGANIZATION CONTEXT CACHE
// ============================================================================

/**
 * Cache em memória para dados de organização
 * Evita buscar no banco a cada evento
 */
interface OrgContext {
  industry_segment?: string;
  company_size?: string;
  cached_at: number;
}

// Cache simples com TTL de 5 minutos
const orgContextCache = new Map<string, OrgContext>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Obtém contexto da organização do cache
 */
function getOrgContext(profileId: string): OrgContext | null {
  const cached = orgContextCache.get(profileId);
  if (!cached) return null;

  // Verificar TTL
  if (Date.now() - cached.cached_at > CACHE_TTL_MS) {
    orgContextCache.delete(profileId);
    return null;
  }

  return cached;
}

/**
 * Atualiza cache de contexto da organização
 * Chamado quando temos os dados do perfil disponíveis
 */
export function updateOrgContext(
  profileId: string,
  industry_segment?: string,
  company_size?: string
): void {
  orgContextCache.set(profileId, {
    industry_segment,
    company_size,
    cached_at: Date.now(),
  });
}

// ============================================================================
// EVENT BUILDING
// ============================================================================

/**
 * Gera UUID v4 usando crypto API
 */
function generateUUID(): string {
  // Fallback para ambientes sem crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Constrói evento completo a partir do input
 * Automaticamente enriquece com dados da organização se disponíveis no cache
 */
function buildEvent(input: TelemetryEventInput): TelemetryEventV1 {
  // Tentar obter contexto da organização do cache
  const orgContext = getOrgContext(input.profile_id);

  // Enriquecer props com dados da organização
  const enrichedProps = {
    ...input.props,
    // Adicionar dados da organização se disponíveis
    ...(orgContext?.industry_segment && { org_industry: orgContext.industry_segment }),
    ...(orgContext?.company_size && { org_size: orgContext.company_size }),
  };

  return {
    event_id: generateUUID(),
    ts: new Date().toISOString(),
    profile_id: input.profile_id,
    org_id: input.profile_id, // Alias para compatibilidade
    actor_id: input.actor_id,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    event_name: input.event_name.toUpperCase(),
    event_version: 1,
    source: 'backend',
    context: {
      flow: input.context?.flow,
      screen: input.context?.screen,
      app_version: APP_VERSION,
      ip_hash: input.context?.ip_hash,
      ua_hash: input.context?.ua_hash,
    },
    props: enrichedProps,
    privacy: {
      contains_pii: input.privacy?.contains_pii ?? false,
      data_category: input.privacy?.data_category || 'operational',
    },
  };
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

/**
 * Envia eventos para Cloudflare Worker
 * @internal
 */
async function sendToCloudflare(
  events: TelemetryEventV1[],
  config: TelemetryConfig
): Promise<IngestResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  try {
    const response = await fetch(config.ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ingestSecret}`,
      },
      body: JSON.stringify(events),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[TELEMETRY] Ingest returned ${response.status}`);
      return null;
    }

    return (await response.json()) as IngestResponse;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[TELEMETRY] Request timed out');
      } else {
        console.warn('[TELEMETRY] Send failed:', error.message);
      }
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Emite um evento de telemetria (fire-and-forget).
 * Retorna imediatamente, nunca bloqueia, nunca lança exceção.
 *
 * @example
 * ```ts
 * emitRawEvent({
 *   profile_id: user.id,
 *   entity_type: 'tool',
 *   entity_id: toolId,
 *   event_name: 'TOOL_ASSIGNED',
 *   props: { collaborator_id: colabId }
 * });
 * ```
 */
export function emitRawEvent(input: TelemetryEventInput): void {
  try {
    const config = getConfig();

    // Verificações rápidas (não bloqueantes)
    if (!config.enabled) return;
    if (!config.ingestUrl) {
      console.warn('[TELEMETRY] CLOUDFLARE_TELEMETRY_INGEST_URL not configured');
      return;
    }
    if (!shouldSample(config.sampleRate)) return;

    // Construir evento
    const event = buildEvent(input);

    // Fire and forget - não aguardar
    sendToCloudflare([event], config).catch(() => {
      // Silenciosamente ignorar todos os erros
    });
  } catch {
    // Silenciosamente ignorar erros de construção
  }
}

/**
 * Emite um evento e aguarda a resposta.
 * Ainda não lança exceção, mas retorna resultado.
 *
 * @returns true se aceito, false caso contrário
 */
export async function emitRawEventAsync(
  input: TelemetryEventInput
): Promise<boolean> {
  try {
    const config = getConfig();

    if (!config.enabled) return false;
    if (!config.ingestUrl) return false;
    if (!shouldSample(config.sampleRate)) return false;

    const event = buildEvent(input);
    const result = await sendToCloudflare([event], config);

    return result !== null && result.accepted > 0;
  } catch {
    return false;
  }
}

/**
 * Emite múltiplos eventos em batch (fire-and-forget).
 *
 * @example
 * ```ts
 * emitBatch([
 *   { profile_id, entity_type: 'tool', event_name: 'TOOL_CREATED', ... },
 *   { profile_id, entity_type: 'movement', event_name: 'MOVEMENT_RECORDED', ... },
 * ]);
 * ```
 */
export function emitBatch(inputs: TelemetryEventInput[]): void {
  try {
    const config = getConfig();

    if (!config.enabled) return;
    if (!config.ingestUrl) return;
    if (inputs.length === 0) return;

    // Aplicar sample rate a cada evento
    const events = inputs
      .filter(() => shouldSample(config.sampleRate))
      .map(buildEvent);

    if (events.length === 0) return;

    // Fire and forget
    sendToCloudflare(events, config).catch(() => { });
  } catch {
    // Silenciosamente ignorar erros
  }
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

/**
 * Objeto de telemetria com métodos convenientes
 */
export const telemetry = {
  /** Emite evento fire-and-forget */
  emit: emitRawEvent,

  /** Emite evento e aguarda resposta */
  emitAsync: emitRawEventAsync,

  /** Emite batch de eventos */
  emitBatch,

  /** Verifica se telemetria está habilitada */
  isEnabled: () => getConfig().enabled,
};
