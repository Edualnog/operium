/**
 * ============================================================================
 * ANALYTICS QUERY WORKER
 * ============================================================================
 * API HTTP para queries no Cloudflare Analytics Engine.
 *
 * Endpoints:
 * - GET  /health            - Health check
 * - GET  /metrics/overview  - Métricas gerais
 * - GET  /metrics/events    - Top eventos
 * - GET  /metrics/pages     - Top páginas
 * - GET  /metrics/industry  - Eventos por setor
 * - GET  /metrics/hourly    - Heatmap por hora
 * - POST /query             - Query SQL customizada
 *
 * Autenticação: Bearer token (ANALYTICS_QUERY_SECRET)
 * ============================================================================
 */

/**
 * Analytics Engine SQL API types
 */
interface AnalyticsEngineDataset {
  writeDataPoint(data: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }): void;
}

interface QueryResult {
  data: Record<string, unknown>[];
  meta: {
    elapsed: number;
    rows_read: number;
    bytes_read: number;
  };
}

/**
 * Bindings do Worker
 */
interface Env {
  ANALYTICS: AnalyticsEngineDataset;
  ANALYTICS_QUERY_SECRET?: string;
  ENVIRONMENT: string;
  WORKER_VERSION: string;
  // Account ID for API queries
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

/**
 * Headers CORS
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handler principal
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check (sem auth)
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse({
        status: 'ok',
        worker: 'operium-analytics-query',
        version: env.WORKER_VERSION || '1.0.0',
        environment: env.ENVIRONMENT || 'production',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /metrics/overview',
          'GET /metrics/events',
          'GET /metrics/pages',
          'GET /metrics/industry',
          'GET /metrics/hourly',
          'POST /query',
        ],
      });
    }

    // Validar autenticação para outros endpoints
    if (env.ANALYTICS_QUERY_SECRET) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
      const token = authHeader.slice(7);
      if (token !== env.ANALYTICS_QUERY_SECRET) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
    }

    // Verificar se temos as credenciais para query
    if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
      return jsonResponse({
        error: 'Analytics Engine query requires CF_ACCOUNT_ID and CF_API_TOKEN secrets',
        note: 'Set these via wrangler secret put CF_ACCOUNT_ID and CF_API_TOKEN'
      }, 500);
    }

    try {
      // Rotas de métricas predefinidas
      if (url.pathname === '/metrics/overview') {
        return await handleOverview(env);
      }

      if (url.pathname === '/metrics/events') {
        const days = parseInt(url.searchParams.get('days') || '7');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        return await handleTopEvents(env, days, limit);
      }

      if (url.pathname === '/metrics/pages') {
        const days = parseInt(url.searchParams.get('days') || '7');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        return await handleTopPages(env, days, limit);
      }

      if (url.pathname === '/metrics/industry') {
        const days = parseInt(url.searchParams.get('days') || '30');
        return await handleByIndustry(env, days);
      }

      if (url.pathname === '/metrics/hourly') {
        const days = parseInt(url.searchParams.get('days') || '7');
        return await handleHourlyHeatmap(env, days);
      }

      // Query customizada
      if (url.pathname === '/query' && request.method === 'POST') {
        const body = await request.json() as { sql: string };
        if (!body.sql) {
          return jsonResponse({ error: 'Missing sql in request body' }, 400);
        }
        return await handleCustomQuery(env, body.sql);
      }

      return jsonResponse({ error: 'Not Found' }, 404);
    } catch (error) {
      console.error('Query error:', error);
      return jsonResponse({
        error: 'Query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  },
};

/**
 * Executa query no Analytics Engine via API
 */
async function executeQuery(env: Env, sql: string): Promise<QueryResult> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'text/plain',
      },
      body: sql,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Analytics Engine API error: ${error}`);
  }

  return await response.json();
}

/**
 * Overview geral
 * Nota: Analytics Engine usa sum(_sample_interval) para contagem
 */
async function handleOverview(env: Env): Promise<Response> {
  const sql = `
    SELECT
      sum(_sample_interval) as total_events,
      avg(double2) as avg_time_on_page_ms
    FROM operium_events
    WHERE timestamp > NOW() - INTERVAL '7' DAY
  `;

  const result = await executeQuery(env, sql);
  return jsonResponse({
    period: 'last_7_days',
    metrics: result.data[0] || {},
    meta: result.meta,
  });
}

/**
 * Top eventos
 */
async function handleTopEvents(env: Env, days: number, limit: number): Promise<Response> {
  const sql = `
    SELECT
      blob1 as event_name,
      sum(_sample_interval) as count
    FROM operium_events
    WHERE timestamp > NOW() - INTERVAL '${days}' DAY
    GROUP BY blob1
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  const result = await executeQuery(env, sql);
  return jsonResponse({
    period: `last_${days}_days`,
    limit,
    events: result.data,
    meta: result.meta,
  });
}

/**
 * Top páginas
 */
async function handleTopPages(env: Env, days: number, limit: number): Promise<Response> {
  const sql = `
    SELECT
      blob5 as page_path,
      sum(_sample_interval) as views,
      avg(double2) as avg_time_ms
    FROM operium_events
    WHERE timestamp > NOW() - INTERVAL '${days}' DAY
      AND blob1 = 'PAGE_VIEWED'
      AND blob5 != ''
    GROUP BY blob5
    ORDER BY views DESC
    LIMIT ${limit}
  `;

  const result = await executeQuery(env, sql);
  return jsonResponse({
    period: `last_${days}_days`,
    limit,
    pages: result.data,
    meta: result.meta,
  });
}

/**
 * Eventos por setor/indústria
 */
async function handleByIndustry(env: Env, days: number): Promise<Response> {
  const sql = `
    SELECT
      blob4 as industry,
      blob1 as event_name,
      sum(_sample_interval) as count
    FROM operium_events
    WHERE timestamp > NOW() - INTERVAL '${days}' DAY
      AND blob4 != 'unknown'
      AND blob4 != ''
    GROUP BY blob4, blob1
    ORDER BY industry, count DESC
  `;

  const result = await executeQuery(env, sql);

  // Agrupar por indústria
  const byIndustry: Record<string, { events: Record<string, number>; total: number }> = {};

  for (const row of result.data) {
    const industry = String(row.industry);
    const eventName = String(row.event_name);
    const count = Number(row.count);

    if (!byIndustry[industry]) {
      byIndustry[industry] = { events: {}, total: 0 };
    }
    byIndustry[industry].events[eventName] = count;
    byIndustry[industry].total += count;
  }

  return jsonResponse({
    period: `last_${days}_days`,
    industries: byIndustry,
    meta: result.meta,
  });
}

/**
 * Heatmap por hora do dia
 */
async function handleHourlyHeatmap(env: Env, days: number): Promise<Response> {
  const sql = `
    SELECT
      intDiv(toUInt32(timestamp - toStartOfDay(timestamp)), 3600) as hour,
      toDayOfWeek(timestamp) as day_of_week,
      sum(_sample_interval) as count
    FROM operium_events
    WHERE timestamp > NOW() - INTERVAL '${days}' DAY
    GROUP BY hour, day_of_week
    ORDER BY day_of_week, hour
  `;

  const result = await executeQuery(env, sql);

  // Criar matriz 7x24 (dias x horas)
  const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

  for (const row of result.data) {
    const hour = Number(row.hour);
    const dayOfWeek = Number(row.day_of_week) - 1; // 1-7 -> 0-6
    const count = Number(row.count);

    if (dayOfWeek >= 0 && dayOfWeek < 7 && hour >= 0 && hour < 24) {
      heatmap[dayOfWeek][hour] = count;
    }
  }

  return jsonResponse({
    period: `last_${days}_days`,
    heatmap,
    days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
    hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    meta: result.meta,
  });
}

/**
 * Query SQL customizada
 */
async function handleCustomQuery(env: Env, sql: string): Promise<Response> {
  // Validar query básica (apenas SELECT permitido)
  const normalizedSql = sql.trim().toUpperCase();
  if (!normalizedSql.startsWith('SELECT')) {
    return jsonResponse({ error: 'Only SELECT queries are allowed' }, 400);
  }

  // Bloquear queries perigosas
  const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];
  for (const keyword of dangerous) {
    if (normalizedSql.includes(keyword)) {
      return jsonResponse({ error: `Keyword ${keyword} is not allowed` }, 400);
    }
  }

  const result = await executeQuery(env, sql);
  return jsonResponse({
    data: result.data,
    meta: result.meta,
  });
}

/**
 * Helper para resposta JSON
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
