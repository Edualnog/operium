/**
 * ============================================================================
 * TELEMETRY CONSUMER WORKER
 * ============================================================================
 * Consome eventos do Queue e escreve em:
 * 1. R2: Armazenamento raw como NDJSON (backup + histórico)
 * 2. Analytics Engine: Time-series para queries SQL em tempo real
 *
 * Particionamento R2:
 * - date=YYYY-MM-DD/hour=HH/org=<org_id>/events-<uuid>.ndjson
 *
 * Analytics Engine Schema:
 * - blobs: event_name, entity_type, org_id, industry, page_path
 * - doubles: count, time_on_page, session_duration
 * - indexes: org_id (para queries por organização)
 * ============================================================================
 */

import type { EnrichedEvent } from '../shared/types';

/**
 * Cloudflare Analytics Engine Dataset type
 */
interface AnalyticsEngineDataset {
  writeDataPoint(data: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }): void;
}

/**
 * Bindings do Worker
 */
interface Env {
  TELEMETRY_BUCKET: R2Bucket;
  ANALYTICS: AnalyticsEngineDataset;
  ENVIRONMENT: string;
  WORKER_VERSION: string;
}

/**
 * Handler principal do Queue Consumer
 */
export default {
  /**
   * Health check endpoint (HTTP)
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(JSON.stringify({
      status: 'ok',
      worker: 'operium-telemetry-consumer',
      version: env.WORKER_VERSION || '1.1.0',
      environment: env.ENVIRONMENT || 'production',
      timestamp: new Date().toISOString(),
      features: ['r2-storage', 'analytics-engine'],
      note: 'This is a Queue Consumer Worker. Events are processed via queue() handler.'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  /**
   * Processa batch de mensagens do Queue
   */
  async queue(batch: MessageBatch<EnrichedEvent>, env: Env): Promise<void> {
    // Agrupar eventos por partição para R2 (date/hour/org)
    const eventsByPartition = new Map<string, EnrichedEvent[]>();

    for (const message of batch.messages) {
      const event = message.body;

      // ========================================
      // 1. Escrever no Analytics Engine
      // ========================================
      try {
        writeToAnalyticsEngine(env.ANALYTICS, event);
      } catch (e) {
        console.error('[CONSUMER] Analytics Engine write failed:', e);
        // Continua mesmo se Analytics Engine falhar
      }

      // ========================================
      // 2. Agrupar para R2
      // ========================================
      const date = event.ts.slice(0, 10); // YYYY-MM-DD
      const hour = event.ts.slice(11, 13); // HH
      const orgId = event.org_id || event.profile_id;

      const partitionKey = `${date}|${hour}|${orgId}`;

      if (!eventsByPartition.has(partitionKey)) {
        eventsByPartition.set(partitionKey, []);
      }
      eventsByPartition.get(partitionKey)!.push(event);
    }

    // ========================================
    // 3. Escrever no R2
    // ========================================
    const writePromises: Promise<void>[] = [];

    for (const [partitionKey, events] of eventsByPartition) {
      const [date, hour, orgId] = partitionKey.split('|');

      const fileId = crypto.randomUUID();
      const path = buildR2Path(date, hour, orgId, fileId);

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n');

      writePromises.push(
        env.TELEMETRY_BUCKET.put(path, ndjson, {
          httpMetadata: {
            contentType: 'application/x-ndjson',
          },
          customMetadata: {
            event_count: events.length.toString(),
            environment: env.ENVIRONMENT,
            worker_version: env.WORKER_VERSION,
            partition_date: date,
            partition_hour: hour,
            partition_org: orgId,
          },
        }).then(() => undefined)
      );
    }

    await Promise.all(writePromises);

    console.log(
      `[CONSUMER] Processed ${batch.messages.length} events: ` +
      `${eventsByPartition.size} R2 partitions, ` +
      `${batch.messages.length} Analytics Engine datapoints`
    );
  },
};

/**
 * Escreve um evento no Analytics Engine
 *
 * Schema:
 * - blob1: event_name (ex: PAGE_VIEWED, TOOL_CREATED)
 * - blob2: entity_type (ex: tool, movement, generic)
 * - blob3: org_id / profile_id
 * - blob4: industry_segment (se disponível)
 * - blob5: page_path (se disponível)
 * - blob6: event source (backend/frontend)
 * - blob7: environment
 *
 * - double1: count (sempre 1, para agregações)
 * - double2: time_on_page_ms (se disponível)
 * - double3: session_duration_ms (se disponível)
 * - double4: numeric value from props (se aplicável)
 *
 * - index1: org_id (para queries por organização)
 */
function writeToAnalyticsEngine(
  analytics: AnalyticsEngineDataset,
  event: EnrichedEvent
): void {
  const props = event.props || {};

  analytics.writeDataPoint({
    blobs: [
      // blob1: event_name
      event.event_name || 'UNKNOWN',
      // blob2: entity_type
      event.entity_type || 'generic',
      // blob3: org_id
      event.org_id || event.profile_id || 'unknown',
      // blob4: industry (from enriched props)
      String(props.org_industry || props.industry_segment || 'unknown'),
      // blob5: page_path
      String(props.page_path || ''),
      // blob6: source
      event.source || 'backend',
      // blob7: environment
      String(props.environment || 'production'),
    ],
    doubles: [
      // double1: count (para SUM)
      1,
      // double2: time_on_page_ms
      Number(props.time_on_page_ms || props.time_on_previous_page_ms || 0),
      // double3: session_duration_ms
      Number(props.session_duration_ms || 0),
      // double4: quantidade (para movimentações)
      Number(props.quantidade || props.count || 0),
    ],
    indexes: [
      // index1: org_id para queries por organização
      event.org_id || event.profile_id || 'unknown',
    ],
  });
}

/**
 * Constrói o path do arquivo no R2
 */
function buildR2Path(date: string, hour: string, orgId: string, fileId: string): string {
  return `date=${date}/hour=${hour}/org=${orgId}/events-${fileId}.ndjson`;
}
