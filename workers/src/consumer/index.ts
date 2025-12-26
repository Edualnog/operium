/**
 * ============================================================================
 * TELEMETRY CONSUMER WORKER
 * ============================================================================
 * Consome eventos do Queue e escreve no R2 como NDJSON.
 *
 * Particionamento:
 * - date=YYYY-MM-DD/hour=HH/org=<org_id>/events-<uuid>.ndjson
 *
 * Características:
 * - Processa batches de até 20 eventos
 * - Agrupa por data/hora/org para otimizar queries
 * - Append-only, nunca sobrescreve
 * ============================================================================
 */

import type { EnrichedEvent } from '../shared/types';

/**
 * Bindings do Worker
 */
interface Env {
  TELEMETRY_BUCKET: R2Bucket;
  ENVIRONMENT: string;
  WORKER_VERSION: string;
}

/**
 * Handler principal do Queue Consumer
 */
export default {
  /**
   * Health check endpoint (HTTP)
   * O consumer é um Queue Worker, mas Cloudflare tenta fazer fetch() para health checks
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(JSON.stringify({
      status: 'ok',
      worker: 'operium-telemetry-consumer',
      version: env.WORKER_VERSION || '1.0.0',
      environment: env.ENVIRONMENT || 'production',
      timestamp: new Date().toISOString(),
      note: 'This is a Queue Consumer Worker. Events are processed via queue() handler, not fetch().'
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
    // Agrupar eventos por partição (date/hour/org)
    const eventsByPartition = new Map<string, EnrichedEvent[]>();

    for (const message of batch.messages) {
      const event = message.body;

      // Extrair componentes da partição
      const date = event.ts.slice(0, 10); // YYYY-MM-DD
      const hour = event.ts.slice(11, 13); // HH
      const orgId = event.org_id || event.profile_id;

      // Criar chave de partição
      const partitionKey = `${date}|${hour}|${orgId}`;

      if (!eventsByPartition.has(partitionKey)) {
        eventsByPartition.set(partitionKey, []);
      }
      eventsByPartition.get(partitionKey)!.push(event);
    }

    // Escrever cada partição no R2
    const writePromises: Promise<void>[] = [];

    for (const [partitionKey, events] of eventsByPartition) {
      const [date, hour, orgId] = partitionKey.split('|');

      // Gerar path único
      const fileId = crypto.randomUUID();
      const path = buildR2Path(date, hour, orgId, fileId);

      // Converter para NDJSON (uma linha JSON por evento)
      const ndjson = events.map((e) => JSON.stringify(e)).join('\n');

      // Escrever no R2
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

    // Aguardar todas as escritas
    await Promise.all(writePromises);

    // Confirmar processamento de todas as mensagens
    // (implícito quando o handler retorna sem erro)
    console.log(
      `[CONSUMER] Processed ${batch.messages.length} events into ${eventsByPartition.size} partitions`
    );
  },
};

/**
 * Constrói o path do arquivo no R2
 * Formato: date=YYYY-MM-DD/hour=HH/org=<org_id>/events-<uuid>.ndjson
 */
function buildR2Path(date: string, hour: string, orgId: string, fileId: string): string {
  return `date=${date}/hour=${hour}/org=${orgId}/events-${fileId}.ndjson`;
}
