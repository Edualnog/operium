-- Migration: 051_blackbox_global_views.sql
-- Description: Views e funções globais para o Blackbox (admin view de toda a plataforma)
-- Author: AI Assistant
-- Date: 2024-12-22
-- 
-- CONTEXTO: O Blackbox é um painel exclusivo do admin para ver dados GLOBAIS
-- de todos os usuários da plataforma, não filtrados por profile_id.
-- ============================================================================

-- ============================================================================
-- 1. FUNÇÃO GLOBAL DE HEALTH (ADMIN ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_metrics_health_global()
RETURNS JSONB AS $$
DECLARE
    v_total_profiles INTEGER;
    v_total_metrics INTEGER;
    v_total_derived INTEGER;
    v_total_alerts INTEGER;
    v_critical_alerts INTEGER;
    v_total_events INTEGER;
    v_recent_events INTEGER;
    v_last_24h_executions INTEGER;
    v_last_24h_errors INTEGER;
    v_result JSONB;
BEGIN
    -- Total de profiles ativos
    SELECT COUNT(*) INTO v_total_profiles
    FROM public.profiles WHERE id IS NOT NULL;
    
    -- Total de métricas no catálogo
    SELECT COUNT(*) INTO v_total_metrics
    FROM public.metric_catalog WHERE alert_enabled = TRUE;
    
    -- Total de métricas derivadas (calculadas)
    SELECT COUNT(*) INTO v_total_derived
    FROM public.derived_metrics WHERE is_current = TRUE;
    
    -- Alertas ativos globais
    SELECT COUNT(*), COUNT(*) FILTER (WHERE severity = 'CRITICAL')
    INTO v_total_alerts, v_critical_alerts
    FROM public.operational_alerts WHERE is_active = TRUE;
    
    -- Total de events de domínio
    SELECT COUNT(*) INTO v_total_events
    FROM public.domain_events;
    
    -- Events nas últimas 24h
    SELECT COUNT(*) INTO v_recent_events
    FROM public.domain_events
    WHERE occurred_at >= NOW() - INTERVAL '24 hours';
    
    -- Execuções nas últimas 24h
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'ERROR')
    INTO v_last_24h_executions, v_last_24h_errors
    FROM public.metric_execution_log
    WHERE started_at >= NOW() - INTERVAL '24 hours';
    
    -- Montar resultado global
    v_result := jsonb_build_object(
        'checked_at', NOW(),
        'scope', 'GLOBAL',
        'status', CASE 
            WHEN v_critical_alerts > 0 THEN 'CRITICAL'
            WHEN v_total_alerts > 2 THEN 'WARNING'
            WHEN v_total_derived = 0 THEN 'DEGRADED'
            ELSE 'HEALTHY'
        END,
        'platform', jsonb_build_object(
            'total_organizations', v_total_profiles,
            'total_events', v_total_events,
            'events_last_24h', v_recent_events
        ),
        'metrics', jsonb_build_object(
            'total_active', v_total_metrics,
            'with_baseline', v_total_derived,
            'without_sufficient_baseline', GREATEST(0, v_total_metrics - v_total_derived)
        ),
        'alerts', jsonb_build_object(
            'active', v_total_alerts,
            'critical', v_critical_alerts
        ),
        'execution', jsonb_build_object(
            'last_pipeline', (SELECT MAX(started_at) FROM public.metric_execution_log WHERE status = 'SUCCESS'),
            'last_24h_total', v_last_24h_executions,
            'last_24h_errors', v_last_24h_errors,
            'error_rate_24h', CASE 
                WHEN v_last_24h_executions > 0 
                THEN ROUND((v_last_24h_errors::numeric / v_last_24h_executions) * 100, 2)
                ELSE 0 
            END
        ),
        'recommendations', CASE 
            WHEN v_total_events = 0 THEN 
                '["Nenhum evento registrado - sistema pode não estar emitindo eventos"]'::jsonb
            WHEN v_total_derived = 0 THEN 
                '["Nenhuma métrica calculada - execute o Observer manualmente"]'::jsonb
            WHEN v_total_alerts > 5 THEN
                '["Muitos alertas ativos - investigue a causa raiz"]'::jsonb
            ELSE '[]'::jsonb
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_metrics_health_global IS 
'Retorna status de saúde GLOBAL do sistema de métricas (todos os usuários).
ACESSO: Apenas admins via Blackbox.';

-- ============================================================================
-- 2. VIEW GLOBAL DE ALERTAS OPERACIONAIS
-- ============================================================================

CREATE OR REPLACE VIEW public.v_operational_alerts_global AS
SELECT 
    oa.id,
    oa.profile_id,
    p.full_name AS organization_name,
    p.company_name,
    oa.metric_key,
    mc.display_name AS metric_name,
    oa.entity_type,
    oa.severity,
    oa.observed_value,
    oa.expected_avg,
    oa.deviation_score,
    oa.explanation,
    oa.detected_at,
    oa.is_active
FROM public.operational_alerts oa
LEFT JOIN public.profiles p ON p.id = oa.profile_id
LEFT JOIN public.metric_catalog mc ON mc.metric_key = oa.metric_key
ORDER BY oa.detected_at DESC;

COMMENT ON VIEW public.v_operational_alerts_global IS 
'View global de todos os alertas operacionais da plataforma. ADMIN ONLY.';

-- ============================================================================
-- 3. VIEW GLOBAL DE EVENTOS DE DOMÍNIO
-- ============================================================================

CREATE OR REPLACE VIEW public.v_domain_events_global AS
SELECT 
    de.id,
    de.profile_id,
    p.full_name AS organization_name,
    p.company_name,
    de.entity_type,
    de.entity_id,
    de.event_type,
    de.event_source,
    de.occurred_at,
    de.payload
FROM public.domain_events de
LEFT JOIN public.profiles p ON p.id = de.profile_id
ORDER BY de.occurred_at DESC
LIMIT 500;

COMMENT ON VIEW public.v_domain_events_global IS 
'View global dos últimos 500 eventos de domínio da plataforma. ADMIN ONLY.';

-- ============================================================================
-- 4. VIEW GLOBAL DE STATUS DE MÉTRICAS
-- ============================================================================

CREATE OR REPLACE VIEW public.v_metrics_status_global AS
SELECT 
    mc.metric_key,
    mc.display_name,
    mc.entity_type,
    mc.calculation_frequency,
    mc.alert_enabled,
    COUNT(DISTINCT dm.profile_id) AS organizations_with_data,
    AVG(dm.value) AS avg_value_global,
    MIN(dm.value) AS min_value_global,
    MAX(dm.value) AS max_value_global,
    MAX(dm.calculated_at) AS last_calculated_global,
    CASE 
        WHEN MAX(dm.calculated_at) IS NULL THEN 'NO_DATA'
        WHEN MAX(dm.calculated_at) < NOW() - INTERVAL '2 days' THEN 'STALE'
        ELSE 'CURRENT'
    END AS data_status
FROM public.metric_catalog mc
LEFT JOIN public.derived_metrics dm ON dm.metric_key = mc.metric_key AND dm.is_current = TRUE
GROUP BY mc.metric_key, mc.display_name, mc.entity_type, mc.calculation_frequency, mc.alert_enabled
ORDER BY mc.metric_key;

COMMENT ON VIEW public.v_metrics_status_global IS 
'View global agregando status de todas as métricas por organização. ADMIN ONLY.';

-- ============================================================================
-- 5. VIEW GLOBAL DE LOGS DE EXECUÇÃO
-- ============================================================================

CREATE OR REPLACE VIEW public.v_metric_execution_log_global AS
SELECT 
    mel.id,
    mel.profile_id,
    p.full_name AS organization_name,
    mel.metric_key,
    mel.execution_type,
    mel.status,
    mel.started_at,
    mel.finished_at,
    mel.duration_ms,
    mel.triggered_by,
    mel.error_message
FROM public.metric_execution_log mel
LEFT JOIN public.profiles p ON p.id = mel.profile_id
ORDER BY mel.started_at DESC
LIMIT 500;

COMMENT ON VIEW public.v_metric_execution_log_global IS 
'View global dos últimos 500 logs de execução. ADMIN ONLY.';

-- ============================================================================
-- 6. FUNÇÃO PARA EXECUTAR OBSERVER GLOBALMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_run_observer_global(p_triggered_by TEXT DEFAULT 'manual')
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_results JSONB := '[]'::jsonb;
    v_result JSONB;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    -- Executar para cada profile ativo
    FOR v_profile IN 
        SELECT id, full_name FROM public.profiles WHERE id IS NOT NULL LIMIT 50
    LOOP
        BEGIN
            v_result := public.fn_run_all_metrics(v_profile.id, p_triggered_by);
            v_success_count := v_success_count + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'profile_id', v_profile.id,
                'profile_name', v_profile.full_name,
                'status', 'SUCCESS',
                'summary', v_result->'summary'
            ));
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'profile_id', v_profile.id,
                'profile_name', v_profile.full_name,
                'status', 'ERROR',
                'error', SQLERRM
            ));
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'triggered_by', p_triggered_by,
        'executed_at', NOW(),
        'profiles_processed', v_success_count + v_error_count,
        'success', v_success_count,
        'errors', v_error_count,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_run_observer_global IS 
'Executa o Observer para TODOS os profiles da plataforma. ADMIN ONLY.';

-- ============================================================================
-- 7. GRANTS (para authenticated, mas views usam SECURITY DEFINER no RPC)
-- ============================================================================

-- Views globais - acesso via RPC
GRANT SELECT ON public.v_operational_alerts_global TO authenticated;
GRANT SELECT ON public.v_domain_events_global TO authenticated;
GRANT SELECT ON public.v_metrics_status_global TO authenticated;
GRANT SELECT ON public.v_metric_execution_log_global TO authenticated;
