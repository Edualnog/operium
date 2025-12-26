/**
 * ============================================================================
 * RATE LIMITER - Proteção contra abuso de API
 * ============================================================================
 * 
 * Implementação simples de rate limiting usando Map em memória.
 * Para produção em escala, considere usar Redis (@upstash/ratelimit).
 * 
 * Limites padrão:
 * - Auth endpoints: 10 req/min
 * - API endpoints: 60 req/min  
 * - CRON endpoints: 5 req/min
 */

type RateLimitConfig = {
    windowMs: number;  // Janela de tempo em ms
    maxRequests: number;  // Máximo de requests na janela
}

type RateLimitEntry = {
    count: number;
    resetAt: number;
}

// Store em memória (reset quando server reinicia)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configurações por tipo de endpoint
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
    auth: { windowMs: 60 * 1000, maxRequests: 10 },      // 10 req/min
    api: { windowMs: 60 * 1000, maxRequests: 60 },       // 60 req/min
    cron: { windowMs: 60 * 1000, maxRequests: 5 },       // 5 req/min
    sensitive: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 req/min (create/delete users)
}

/**
 * Verifica se o identificador (IP ou userId) excedeu o limite
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
    identifier: string,
    configKey: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): { allowed: boolean; remaining: number; resetAt: number; retryAfterMs: number } {
    const config = RATE_LIMIT_CONFIGS[configKey];
    const now = Date.now();
    const key = `${configKey}:${identifier}`;

    let entry = rateLimitStore.get(key);

    // Limpar entradas expiradas periodicamente (a cada 100 checks)
    if (Math.random() < 0.01) {
        cleanupExpiredEntries();
    }

    // Se não existe ou expirou, criar nova entrada
    if (!entry || now > entry.resetAt) {
        entry = { count: 1, resetAt: now + config.windowMs };
        rateLimitStore.set(key, entry);
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: entry.resetAt,
            retryAfterMs: 0
        };
    }

    // Incrementar contador
    entry.count++;

    // Verificar se excedeu
    if (entry.count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt,
            retryAfterMs: entry.resetAt - now
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
        retryAfterMs: 0
    };
}

/**
 * Limpa entradas expiradas do store
 */
function cleanupExpiredEntries() {
    const now = Date.now();
    const entries = Array.from(rateLimitStore.entries());
    for (const [key, entry] of entries) {
        if (now > entry.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Retorna headers de rate limit para a resposta
 */
export function getRateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
    return {
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        ...(result.retryAfterMs > 0 && { 'Retry-After': Math.ceil(result.retryAfterMs / 1000).toString() })
    };
}

/**
 * Extrai IP do request (com suporte a proxies)
 */
export function getClientIP(request: Request): string {
    // Vercel/Cloudflare headers
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    const cfIP = request.headers.get('cf-connecting-ip');
    if (cfIP) {
        return cfIP;
    }

    return 'unknown';
}
