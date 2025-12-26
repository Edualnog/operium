/**
 * ============================================================================
 * TELEMETRY INGEST WORKER
 * ============================================================================
 * Endpoint HTTP para ingestão de eventos de telemetria industrial.
 *
 * - POST /ingest: Recebe eventos, valida e publica no Queue
 * - GET /health: Health check
 *
 * Características:
 * - Responde 202 rapidamente
 * - Nunca faz joins ou enriquecimentos pesados
 * - Valida Bearer Token
 * - Adiciona metadata (received_at, edge_region)
 * ============================================================================
 */

import type { TelemetryEventV1, EnrichedEvent, IngestResponse } from '../shared/types';
import { validateEvent, validateMinimalFields, ValidationError } from '../shared/validation';

/**
 * Bindings do Worker
 */
interface Env {
  TELEMETRY_QUEUE: Queue<EnrichedEvent>;
  TELEMETRY_INGEST_SECRET: string;
  ENVIRONMENT: string;
  WORKER_VERSION: string;
}

/**
 * Headers CORS para permitir chamadas do backend
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handler principal do Worker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          version: env.WORKER_VERSION,
          environment: env.ENVIRONMENT,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        }
      );
    }

    // Ingest endpoint
    if (url.pathname === '/ingest') {
      return handleIngest(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Processa requisição de ingestão
 */
async function handleIngest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Apenas POST
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  // Validar Bearer Token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  const token = authHeader.slice(7);
  if (token !== env.TELEMETRY_INGEST_SECRET) {
    return new Response('Forbidden', {
      status: 403,
      headers: CORS_HEADERS,
    });
  }

  try {
    // Parse body
    const body = await request.json();
    const events: unknown[] = Array.isArray(body) ? body : [body];

    // Processar eventos
    const enrichedEvents: EnrichedEvent[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    const receivedAt = new Date().toISOString();
    const edgeRegion = (request.cf?.colo as string) || 'unknown';

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      try {
        // Validação completa
        validateEvent(event);

        // Enriquecer evento
        const enriched: EnrichedEvent = {
          ...event,
          // Garantir org_id como alias
          org_id: event.org_id || event.profile_id,
          // Metadata do ingest
          received_at: receivedAt,
          edge_region: edgeRegion,
          ingest_worker_version: env.WORKER_VERSION,
        };

        enrichedEvents.push(enriched);
      } catch (e) {
        if (e instanceof ValidationError) {
          errors.push({ index: i, error: e.message });
        } else {
          errors.push({ index: i, error: 'Unknown validation error' });
        }
      }
    }

    // Publicar eventos válidos no Queue
    if (enrichedEvents.length > 0) {
      // Usar waitUntil para não bloquear resposta
      ctx.waitUntil(
        env.TELEMETRY_QUEUE.sendBatch(
          enrichedEvents.map((event) => ({ body: event }))
        )
      );
    }

    // Resposta rápida
    const response: IngestResponse = {
      accepted: enrichedEvents.length,
      rejected: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(response), {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (e) {
    console.error('Ingest error:', e);

    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: e instanceof Error ? e.message : 'Invalid JSON body',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }
}
