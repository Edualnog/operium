-- ============================================================================
-- Migration: 049_metric_orchestration_layer.sql
-- Description: Camada de orquestração para execução de métricas
-- Author: AI Assistant
-- Date: 2024-12-19
-- 
-- PRINCÍPIOS:
-- 1. Métricas NUNCA rodam sozinhas - sempre acionadas externamente
-- 2. Execução é determinística e auditável
-- 3. Falhas são isoladas por métrica (não quebram pipeline)
-- 4. Tudo é logado em metric_execution_log
-- ============================================================================

-- ============================================================================
-- PARTE 1: TABELA DE LOG DE EXECUÇÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.metric_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Identificação
    metric_key TEXT REFERENCES public.metric_catalog(metric_key),
    execution_type TEXT NOT NULL CHECK (execution_type IN (
        'CALCULATION',      -- Cálculo de métrica
        'BASELINE_UPDATE',  -- Atualização de baseline
        'ALERT_CHECK',      -- Verificação de desvio/alerta
        'FULL_PIPELINE',    -- Pipeline completo
        'HEALTH_CHECK'      -- Verificação de saúde
    )),
    
    -- Status
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'SUCCESS', 'ERROR', 'SKIPPED')),
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER GENERATED ALWAYS AS (
        CASE WHEN finished_at IS NOT NULL 
        THEN EXTRACT(MILLISECONDS FROM (finished_at - started_at))::integer 
        ELSE NULL END
    ) STORED,
    
    -- Resultado
    execution_summary JSONB DEFAULT '{}',
    error_message TEXT,
    error_detail JSONB,
    
    -- Contexto
    triggered_by TEXT DEFAULT 'manual' CHECK (triggered_by IN (
        'manual',       -- Chamada manual
        'edge_function', -- Supabase Edge Function
        'cron',         -- Cron externo
        'n8n',          -- n8n/workflow
        'api',          -- API externa
        'system'        -- Sistema interno
    )),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_metric_execution_log_profile 
    ON public.metric_execution_log(profile_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_execution_log_metric 
    ON public.metric_execution_log(metric_key, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_execution_log_status 
    ON public.metric_execution_log(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_execution_log_type 
    ON public.metric_execution_log(execution_type, started_at DESC);

-- RLS
ALTER TABLE public.metric_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own execution logs" ON public.metric_execution_log
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

COMMENT ON TABLE public.metric_execution_log IS 
'Log de execução de métricas e pipeline.
GOVERNANÇA:
1. Toda execução é registrada aqui
2. Usado para auditoria e debugging
3. Permite rastrear frequência e erros
4. duration_ms calculado automaticamente';

-- ============================================================================
-- PARTE 2: FUNÇÃO DE PIPELINE POR MÉTRICA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_run_metric_pipeline(
    p_profile_id UUID,
    p_metric_key TEXT DEFAULT NULL,
    p_triggered_by TEXT DEFAULT 'manual'
) RETURNS JSONB AS $$
DECLARE
    v_metric RECORD;
    v_log_id UUID;
    v_calc_result JSONB;
    v_baseline_result JSONB;
    v_deviation_result JSONB;
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_results JSONB := '[]'::jsonb;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_should_run BOOLEAN;
    v_last_run TIMESTAMPTZ;
    v_interval INTERVAL;
BEGIN
    -- Loop através das métricas
    FOR v_metric IN 
        SELECT * FROM public.metric_catalog 
        WHERE (p_metric_key IS NULL OR metric_key = p_metric_key)
        ORDER BY metric_key
    LOOP
        BEGIN
            -- Verificar frequência de execução
            SELECT MAX(started_at) INTO v_last_run
            FROM public.metric_execution_log
            WHERE profile_id = p_profile_id
              AND metric_key = v_metric.metric_key
              AND execution_type = 'CALCULATION'
              AND status = 'SUCCESS';
            
            -- Calcular intervalo baseado na frequência
            v_interval := CASE v_metric.calculation_frequency
                WHEN 'hourly' THEN INTERVAL '1 hour'
                WHEN 'daily' THEN INTERVAL '1 day'
                WHEN 'weekly' THEN INTERVAL '7 days'
                WHEN 'monthly' THEN INTERVAL '30 days'
                ELSE INTERVAL '1 day'
            END;
            
            -- Verificar se deve executar
            v_should_run := v_last_run IS NULL OR v_last_run < (NOW() - v_interval);
            
            IF NOT v_should_run THEN
                -- Skip - já executou recentemente
                v_skipped_count := v_skipped_count + 1;
                v_results := v_results || jsonb_build_array(jsonb_build_object(
                    'metric_key', v_metric.metric_key,
                    'status', 'SKIPPED',
                    'reason', 'Already executed within frequency window',
                    'last_run', v_last_run
                ));
                CONTINUE;
            END IF;
            
            -- Registrar início da execução
            INSERT INTO public.metric_execution_log (
                profile_id, metric_key, execution_type, status, triggered_by
            ) VALUES (
                p_profile_id, v_metric.metric_key, 'CALCULATION', 'RUNNING', p_triggered_by
            ) RETURNING id INTO v_log_id;
            
            -- 1. Calcular métrica
            v_calc_result := public.fn_calculate_metric(v_metric.metric_key, p_profile_id);
            
            -- 2. Atualizar baseline se necessário
            IF v_metric.baseline_required AND (v_calc_result->>'success')::boolean THEN
                v_baseline_result := public.fn_update_baseline(v_metric.metric_key, p_profile_id);
            ELSE
                v_baseline_result := jsonb_build_object('skipped', TRUE);
            END IF;
            
            -- 3. Verificar desvios se alertas habilitados
            IF v_metric.alert_enabled AND (v_calc_result->>'success')::boolean THEN
                v_deviation_result := public.fn_detect_deviation(v_metric.metric_key, p_profile_id);
            ELSE
                v_deviation_result := jsonb_build_object('skipped', TRUE);
            END IF;
            
            -- Atualizar log com sucesso
            UPDATE public.metric_execution_log
            SET status = 'SUCCESS',
                finished_at = clock_timestamp(),
                execution_summary = jsonb_build_object(
                    'calculation', v_calc_result,
                    'baseline', v_baseline_result,
                    'deviation', v_deviation_result
                )
            WHERE id = v_log_id;
            
            v_success_count := v_success_count + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'metric_key', v_metric.metric_key,
                'status', 'SUCCESS',
                'calculation', v_calc_result,
                'baseline', v_baseline_result,
                'deviation', v_deviation_result
            ));
            
        EXCEPTION WHEN OTHERS THEN
            -- Registrar erro (não quebra o pipeline)
            IF v_log_id IS NOT NULL THEN
                UPDATE public.metric_execution_log
                SET status = 'ERROR',
                    finished_at = clock_timestamp(),
                    error_message = SQLERRM,
                    error_detail = jsonb_build_object('sqlstate', SQLSTATE)
                WHERE id = v_log_id;
            END IF;
            
            v_error_count := v_error_count + 1;
            v_results := v_results || jsonb_build_array(jsonb_build_object(
                'metric_key', v_metric.metric_key,
                'status', 'ERROR',
                'error', SQLERRM
            ));
        END;
    END LOOP;
    
    -- Retornar summary
    RETURN jsonb_build_object(
        'profile_id', p_profile_id,
        'triggered_by', p_triggered_by,
        'started_at', v_start_time,
        'finished_at', clock_timestamp(),
        'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::integer,
        'summary', jsonb_build_object(
            'success', v_success_count,
            'errors', v_error_count,
            'skipped', v_skipped_count,
            'total', v_success_count + v_error_count + v_skipped_count
        ),
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_run_metric_pipeline IS 
'Pipeline principal de execução de métricas.
Executa: cálculo → baseline → detecção de desvio.
Respeita calculation_frequency e min_sample_size.
Falhas são isoladas por métrica (não quebram pipeline).
ACIONAMENTO: Edge Function, cron, n8n, API externa.';

-- ============================================================================
-- PARTE 3: FUNÇÃO DE EXECUÇÃO EM LOTE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_run_all_metrics(
    p_profile_id UUID,
    p_triggered_by TEXT DEFAULT 'manual',
    p_force BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_log_id UUID;
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_result JSONB;
BEGIN
    -- Registrar início do pipeline completo
    INSERT INTO public.metric_execution_log (
        profile_id, metric_key, execution_type, status, triggered_by
    ) VALUES (
        p_profile_id, NULL, 'FULL_PIPELINE', 'RUNNING', p_triggered_by
    ) RETURNING id INTO v_log_id;
    
    -- Executar pipeline para todas as métricas
    v_result := public.fn_run_metric_pipeline(p_profile_id, NULL, p_triggered_by);
    
    -- Atualizar log
    UPDATE public.metric_execution_log
    SET status = 'SUCCESS',
        finished_at = clock_timestamp(),
        execution_summary = v_result
    WHERE id = v_log_id;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    UPDATE public.metric_execution_log
    SET status = 'ERROR',
        finished_at = clock_timestamp(),
        error_message = SQLERRM,
        error_detail = jsonb_build_object('sqlstate', SQLSTATE)
    WHERE id = v_log_id;
    
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'profile_id', p_profile_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_run_all_metrics IS 
'Executa pipeline para TODAS as métricas elegíveis de um profile.
Wrapper conveniente para fn_run_metric_pipeline.
Registra execução como FULL_PIPELINE.';

-- ============================================================================
-- PARTE 4: FUNÇÃO DE HEALTH/STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_metrics_health(p_profile_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_log_id UUID;
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_active_metrics INTEGER;
    v_metrics_with_baseline INTEGER;
    v_metrics_without_baseline INTEGER;
    v_active_alerts INTEGER;
    v_critical_alerts INTEGER;
    v_last_pipeline TIMESTAMPTZ;
    v_last_24h_executions INTEGER;
    v_last_24h_errors INTEGER;
    v_stale_metrics JSONB;
    v_result JSONB;
BEGIN
    -- Registrar health check
    INSERT INTO public.metric_execution_log (
        profile_id, execution_type, status, triggered_by
    ) VALUES (
        p_profile_id, 'HEALTH_CHECK', 'RUNNING', 'manual'
    ) RETURNING id INTO v_log_id;
    
    -- Contar métricas ativas
    SELECT COUNT(*) INTO v_active_metrics
    FROM public.metric_catalog 
    WHERE alert_enabled = TRUE;
    
    -- Métricas com baseline
    SELECT COUNT(DISTINCT metric_key) INTO v_metrics_with_baseline
    FROM public.operational_baselines
    WHERE profile_id = p_profile_id AND is_active = TRUE;
    
    -- Métricas sem baseline suficiente
    SELECT COUNT(*) INTO v_metrics_without_baseline
    FROM public.metric_catalog mc
    WHERE mc.baseline_required = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM public.operational_baselines ob
          WHERE ob.profile_id = p_profile_id 
            AND ob.metric_key = mc.metric_key
            AND ob.is_active = TRUE
            AND ob.sample_size >= mc.min_sample_size
      );
    
    -- Alertas ativos
    SELECT COUNT(*), COUNT(*) FILTER (WHERE severity = 'CRITICAL')
    INTO v_active_alerts, v_critical_alerts
    FROM public.operational_alerts
    WHERE profile_id = p_profile_id AND is_active = TRUE;
    
    -- Última execução do pipeline
    SELECT MAX(started_at) INTO v_last_pipeline
    FROM public.metric_execution_log
    WHERE profile_id = p_profile_id 
      AND execution_type = 'FULL_PIPELINE'
      AND status = 'SUCCESS';
    
    -- Execuções nas últimas 24h
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'ERROR')
    INTO v_last_24h_executions, v_last_24h_errors
    FROM public.metric_execution_log
    WHERE profile_id = p_profile_id
      AND started_at >= NOW() - INTERVAL '24 hours';
    
    -- Métricas obsoletas (sem cálculo recente)
    SELECT jsonb_agg(jsonb_build_object(
        'metric_key', mc.metric_key,
        'last_calculated', dm.calculated_at,
        'expected_frequency', mc.calculation_frequency
    )) INTO v_stale_metrics
    FROM public.metric_catalog mc
    LEFT JOIN LATERAL (
        SELECT calculated_at FROM public.derived_metrics dm
        WHERE dm.profile_id = p_profile_id 
          AND dm.metric_key = mc.metric_key
          AND dm.is_current = TRUE
        ORDER BY calculated_at DESC LIMIT 1
    ) dm ON TRUE
    WHERE mc.alert_enabled = TRUE
      AND (
          dm.calculated_at IS NULL
          OR dm.calculated_at < NOW() - CASE mc.calculation_frequency
              WHEN 'hourly' THEN INTERVAL '2 hours'
              WHEN 'daily' THEN INTERVAL '2 days'
              WHEN 'weekly' THEN INTERVAL '14 days'
              ELSE INTERVAL '2 days'
          END
      );
    
    -- Montar resultado
    v_result := jsonb_build_object(
        'profile_id', p_profile_id,
        'checked_at', NOW(),
        'status', CASE 
            WHEN v_critical_alerts > 0 THEN 'CRITICAL'
            WHEN v_active_alerts > 0 THEN 'WARNING'
            WHEN v_metrics_without_baseline > (v_active_metrics / 2) THEN 'DEGRADED'
            ELSE 'HEALTHY'
        END,
        'metrics', jsonb_build_object(
            'total_active', v_active_metrics,
            'with_baseline', v_metrics_with_baseline,
            'without_sufficient_baseline', v_metrics_without_baseline,
            'stale', v_stale_metrics
        ),
        'alerts', jsonb_build_object(
            'active', v_active_alerts,
            'critical', v_critical_alerts
        ),
        'execution', jsonb_build_object(
            'last_pipeline', v_last_pipeline,
            'last_24h_total', v_last_24h_executions,
            'last_24h_errors', v_last_24h_errors,
            'error_rate_24h', CASE 
                WHEN v_last_24h_executions > 0 
                THEN ROUND((v_last_24h_errors::numeric / v_last_24h_executions) * 100, 2)
                ELSE 0 
            END
        ),
        'recommendations', CASE 
            WHEN v_last_pipeline IS NULL THEN 
                '["Execute fn_run_all_metrics para inicializar métricas"]'::jsonb
            WHEN v_metrics_without_baseline > 0 THEN 
                '["Aguarde mais dados para estabelecer baselines"]'::jsonb
            WHEN v_stale_metrics IS NOT NULL AND jsonb_array_length(v_stale_metrics) > 0 THEN
                '["Algumas métricas estão desatualizadas - verifique pipeline"]'::jsonb
            ELSE '[]'::jsonb
        END
    );
    
    -- Atualizar log
    UPDATE public.metric_execution_log
    SET status = 'SUCCESS',
        finished_at = clock_timestamp(),
        execution_summary = v_result
    WHERE id = v_log_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_metrics_health IS 
'Retorna status de saúde do sistema de métricas.
Inclui: métricas ativas, alertas, baselines, execuções recentes.
Útil para dashboards e monitoramento.';

-- ============================================================================
-- PARTE 5: FUNÇÃO DE LIMPEZA DE LOGS ANTIGOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_cleanup_execution_logs(
    p_retention_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.metric_execution_log
    WHERE created_at < NOW() - (p_retention_days || ' days')::interval
    RETURNING 1;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'deleted_count', v_deleted_count,
        'retention_days', p_retention_days,
        'cleaned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_cleanup_execution_logs IS 
'Remove logs de execução antigos para manter banco limpo.
Chamar periodicamente (ex: semanalmente).';

-- ============================================================================
-- PARTE 6: VIEW DE STATUS RÁPIDO
-- ============================================================================

CREATE OR REPLACE VIEW public.v_metrics_status AS
SELECT 
    mc.metric_key,
    mc.display_name,
    mc.entity_type,
    mc.calculation_frequency,
    mc.alert_enabled,
    dm.value AS current_value,
    dm.confidence_level,
    dm.calculated_at AS last_calculated,
    ob.expected_avg,
    ob.expected_min,
    ob.expected_max,
    ob.sample_size AS baseline_sample_size,
    CASE 
        WHEN dm.calculated_at IS NULL THEN 'NO_DATA'
        WHEN dm.calculated_at < NOW() - CASE mc.calculation_frequency
            WHEN 'hourly' THEN INTERVAL '2 hours'
            WHEN 'daily' THEN INTERVAL '2 days'
            WHEN 'weekly' THEN INTERVAL '14 days'
            ELSE INTERVAL '2 days'
        END THEN 'STALE'
        ELSE 'CURRENT'
    END AS data_status
FROM public.metric_catalog mc
LEFT JOIN public.derived_metrics dm ON dm.metric_key = mc.metric_key AND dm.is_current = TRUE
LEFT JOIN public.operational_baselines ob ON ob.metric_key = mc.metric_key AND ob.is_active = TRUE;

ALTER VIEW public.v_metrics_status SET (security_invoker = on);

COMMENT ON VIEW public.v_metrics_status IS 
'View de status rápido de todas as métricas.
Mostra valor atual, baseline e status de atualização.';

-- ============================================================================
-- PARTE 7: GRANTS
-- ============================================================================

GRANT SELECT ON public.metric_execution_log TO authenticated;
GRANT SELECT ON public.v_metrics_status TO authenticated;

-- ============================================================================
-- PARTE 8: GOVERNANÇA FINAL
-- ============================================================================

COMMENT ON SCHEMA public IS 
'Schema principal do ERP com sistema de métricas e observador ativo.

ARQUITETURA DE ORQUESTRAÇÃO:
============================

┌─────────────────────────────────────────────────────────────────┐
│                    ACIONADORES EXTERNOS                         │
│    Edge Function │ Cron │ n8n │ API │ Manual                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              fn_run_all_metrics / fn_run_metric_pipeline        │
│                    (Orquestração Central)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│fn_calculate_    │ │fn_update_       │ │fn_detect_       │
│metric           │ │baseline         │ │deviation        │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│derived_metrics  │ │operational_     │ │operational_     │
│                 │ │baselines        │ │alerts           │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │
         └──────────────────┬──────────────────────────────────────
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    metric_execution_log                         │
│                    (Auditoria Completa)                         │
└─────────────────────────────────────────────────────────────────┘

REGRAS DE OURO:
1. Métricas NUNCA rodam sozinhas - sempre acionadas externamente
2. Execução é determinística e auditável
3. Falhas são isoladas (não quebram pipeline)
4. Tudo é rastreável via metric_execution_log
5. fn_metrics_health para monitoramento
';
