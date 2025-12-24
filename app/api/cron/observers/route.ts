import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ============================================================================
 * CRON ENDPOINT: OBSERVER EXECUTION
 * ============================================================================
 * 
 * Este endpoint é chamado periodicamente (hourly) para executar observers
 * comportamentais que analisam eventos históricos e geram eventos derivados.
 * 
 * SCHEDULING:
 * - Configurado em vercel.json para executar hourly
 * - Requer CRON_SECRET para autenticação
 * 
 * OBSERVERS EXECUTADOS:
 * - fn_observe_repeated_late_returns
 * - fn_observe_missing_actions
 * - fn_observe_process_deviations
 * - fn_observe_operational_friction
 * ============================================================================
 */

// Constants
const CRON_SECRET = process.env.CRON_SECRET || 'development-secret';
const MAX_EXECUTION_TIME_MS = 50000; // 50 segundos (limite do Vercel: 60s)

export const runtime = 'edge';
export const maxDuration = 60; // Vercel Edge Function timeout

export async function GET(request: NextRequest) {
    const startTime = Date.now();

    try {
        // 1. Verificar autenticação do cron
        const authHeader = request.headers.get('authorization');
        const providedSecret = authHeader?.replace('Bearer ', '');

        if (providedSecret !== CRON_SECRET) {
            console.error('[CRON] Unauthorized access attempt');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[CRON] Observer execution started');

        // 2. Criar cliente Supabase com service_role (necessário para observers)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Buscar todas as organizações ativas (profiles com eventos recentes)
        const { data: activeProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .limit(100); // Processa em lotes de 100

        if (profilesError) {
            throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
        }

        if (!activeProfiles || activeProfiles.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active profiles to process',
                execution_time_ms: Date.now() - startTime
            });
        }

        console.log(`[CRON] Processing ${activeProfiles.length} profiles`);

        // 4. Executar observers para cada perfil
        const results: any[] = [];
        let successCount = 0;
        let failureCount = 0;

        for (const profile of activeProfiles) {
            // Verificar timeout
            if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
                console.warn(`[CRON] Timeout approaching, stopping at profile ${results.length + 1}/${activeProfiles.length}`);
                break;
            }

            try {
                // Chamar função master de observer
                const { data, error } = await supabase.rpc('fn_run_all_observers', {
                    p_profile_id: profile.id
                });

                if (error) {
                    console.error(`[CRON] Observer failed for profile ${profile.id}:`, error);
                    failureCount++;
                    results.push({
                        profile_id: profile.id,
                        status: 'FAILURE',
                        error: error.message
                    });
                } else {
                    successCount++;
                    results.push({
                        profile_id: profile.id,
                        status: 'SUCCESS',
                        events_generated: data?.total_events_generated || 0,
                        observers_failed: data?.observers_failed || 0
                    });

                    console.log(`[CRON] ✓ Profile ${profile.id}: ${data?.total_events_generated || 0} events generated`);
                }
            } catch (err) {
                console.error(`[CRON] Exception for profile ${profile.id}:`, err);
                failureCount++;
                results.push({
                    profile_id: profile.id,
                    status: 'ERROR',
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        const executionTimeMs = Date.now() - startTime;

        console.log(`[CRON] Observer execution completed: ${successCount} success, ${failureCount} failures, ${executionTimeMs}ms`);

        // 5. Retornar sumário
        return NextResponse.json({
            success: true,
            execution_timestamp: new Date().toISOString(),
            execution_time_ms: executionTimeMs,
            profiles_processed: results.length,
            profiles_success: successCount,
            profiles_failed: failureCount,
            total_events_generated: results.reduce((sum, r) => sum + (r.events_generated || 0), 0),
            results: results
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (error) {
        console.error('[CRON] Fatal error:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            execution_time_ms: Date.now() - startTime
        }, {
            status: 500
        });
    }
}

// Bloquear outros métodos HTTP
export async function POST() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
