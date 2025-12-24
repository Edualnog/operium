-- ============================================================================
-- Migration: 107_derived_events_metrics_integration.sql
-- Description: Integração de eventos derivados com sistema de métricas
-- Author: AI Assistant
-- Date: 2024-12-24
-- 
-- OBJETIVO:
-- Atualizar cálculos de collaborator_behavior_features e derived_metrics
-- para incorporar eventos derivados comportamentais
-- ============================================================================

-- ============================================================================
-- PARTE 1: ATUALIZAR collaborator_behavior_features COM EVENTOS DERIVADOS
-- ============================================================================

-- Atualizar função de cálculo de scores comportamentais
CREATE OR REPLACE FUNCTION analytics.calculate_collaborator_scores()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Upsert scores baseados em dados existentes + eventos derivados
    INSERT INTO public.collaborator_behavior_features (
        collaborator_id,
        responsibility_score,
        risk_exposure_score,
        process_adherence_score,
        incident_rate,
        calculated_at,
        calculation_version
    )
    SELECT
        c.id AS collaborator_id,
        
        -- RESPONSIBILITY SCORE: Baseado em long_retention_rate (inverso) + penalidade por padrões de atraso
        GREATEST(0, COALESCE(
            (1 - COALESCE(cb.long_retention_rate, 0)) * 100, 
            50 -- Default para colaboradores sem histórico
        ) - (derived_late_pattern.penalty * 10))::NUMERIC(5,2) AS responsibility_score,
        
        -- RISK EXPOSURE: Baseado em consertos + eventos de fricção operacional
        LEAST(100, COALESCE(
            CASE 
                WHEN cb.total_operations > 0 THEN
                    (consertos_count.cnt::NUMERIC / cb.total_operations) * 100
                ELSE 0
            END,
            0
        ) + (derived_friction.friction_score * 5))::NUMERIC(5,2) AS risk_exposure_score,
        
        -- PROCESS ADHERENCE: Baseado em termos vs operações - penalidade por desvios
        GREATEST(0, COALESCE(
            CASE 
                WHEN cb.total_operations > 0 THEN
                    LEAST(100, (termos_count.cnt::NUMERIC / cb.total_operations) * 100)
                ELSE 50 -- Default neutro
            END,
            50
        ) - (derived_deviations.deviation_count * 5))::NUMERIC(5,2) AS process_adherence_score,
        
        -- INCIDENT RATE: Ajustes de inventário + eventos derivados
        COALESCE(
            CASE 
                WHEN cb.total_operations > 0 THEN
                    ((divergence_count.cnt + derived_incidents.incident_count)::NUMERIC / cb.total_operations)
                ELSE 0
            END,
            0
        )::NUMERIC(5,4) AS incident_rate,
        
        NOW() AS calculated_at,
        2 AS calculation_version  -- Incrementado de 1 para 2
        
    FROM public.colaboradores c
    LEFT JOIN analytics.collaborator_behavior cb ON c.id = cb.colaborador_id
    
    -- Contadores existentes
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt 
        FROM public.consertos con
        JOIN public.movimentacoes m ON m.ferramenta_id = con.ferramenta_id
        WHERE m.colaborador_id = c.id
    ) consertos_count ON true
    
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt 
        FROM public.termos_responsabilidade t
        WHERE t.colaborador_id = c.id
    ) termos_count ON true
    
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt 
        FROM analytics.events_log e
        WHERE e.actor_id = c.id AND e.signal_type = 'DIVERGENCE'
    ) divergence_count ON true
    
    -- NOVOS: Contadores de eventos derivados
    LEFT JOIN LATERAL (
        SELECT 
            COUNT(CASE WHEN de.payload->>'severity' IN ('HIGH', 'CRITICAL') THEN 1 END) AS penalty
        FROM public.domain_events de
        WHERE de.profile_id = c.profile_id
          AND de.entity_type = 'collaborator'
          AND de.entity_id = c.id
          AND de.event_type = 'REPEATED_LATE_RETURN_PATTERN'
          AND de.event_source = 'automation'
          AND de.occurred_at >= NOW() - INTERVAL '90 days'
    ) derived_late_pattern ON true
    
    LEFT JOIN LATERAL (
        SELECT 
            COUNT(*) AS friction_score
        FROM public.domain_events de
        WHERE de.profile_id = c.profile_id
          AND de.entity_type = 'collaborator'
          AND de.entity_id = c.id
          AND de.event_type = 'OPERATIONAL_FRICTION_SIGNAL'
          AND de.event_source = 'automation'
          AND de.occurred_at >= NOW() - INTERVAL '30 days'
    ) derived_friction ON true
    
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS deviation_count
        FROM public.domain_events de
        WHERE de.profile_id = c.profile_id
          AND de.event_type = 'PROCESS_DEVIATION_DETECTED'
          AND de.event_source = 'automation'
          AND (de.payload->>'colaborador_id')::uuid = c.id
          AND de.occurred_at >= NOW() - INTERVAL '30 days'
    ) derived_deviations ON true
    
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS incident_count
        FROM public.domain_events de
        WHERE de.profile_id = c.profile_id
          AND de.entity_type = 'collaborator'
          AND de.entity_id = c.id
          AND de.event_type IN ('REPEATED_LATE_RETURN_PATTERN', 'EXPECTED_ACTION_NOT_TAKEN')
          AND de.event_source = 'automation'
          AND de.payload->>'severity' IN ('HIGH', 'CRITICAL')
          AND de.occurred_at >= NOW() - INTERVAL '30 days'
    ) derived_incidents ON true
    
    ON CONFLICT (collaborator_id) DO UPDATE SET
        responsibility_score = EXCLUDED.responsibility_score,
        risk_exposure_score = EXCLUDED.risk_exposure_score,
        process_adherence_score = EXCLUDED.process_adherence_score,
        incident_rate = EXCLUDED.incident_rate,
        calculated_at = NOW(),
        calculation_version = 2;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION analytics.calculate_collaborator_scores IS 
'Recalcula scores comportamentais para todos os colaboradores.
VERSÃO 2: Integra eventos derivados (padrões de atraso, fricção, desvios).
Executar via job agendado.';

-- ============================================================================
-- PARTE 2: ATUALIZAR v_calc_collaborator_incident_rate
-- ============================================================================

CREATE OR REPLACE VIEW public.v_calc_collaborator_incident_rate AS
WITH collaborator_incidents AS (
    SELECT 
        c.profile_id,
        c.id AS collaborator_id,
        c.nome,
        -- Contar movimentações com atraso
        COUNT(CASE WHEN m.devolucao_at > m.prazo_devolucao THEN 1 END) AS late_returns,
        -- Contar ferramentas danificadas
        COUNT(CASE WHEN m.tipo = 'conserto' THEN 1 END) AS repair_incidents,
        -- NOVO: Contar eventos derivados de alta severidade
        COUNT(CASE 
            WHEN de.event_type IN ('REPEATED_LATE_RETURN_PATTERN', 'EXPECTED_ACTION_NOT_TAKEN')
                 AND de.payload->>'severity' IN ('HIGH', 'CRITICAL')
            THEN 1 
        END) AS behavior_incidents,
        COUNT(*) AS total_movements
    FROM public.colaboradores c
    LEFT JOIN public.movimentacoes m ON m.colaborador_id = c.id
    -- NOVO: Join com eventos derivados
    LEFT JOIN public.domain_events de ON de.entity_id = c.id 
        AND de.entity_type = 'collaborator'
        AND de.event_source = 'automation'
        AND de.occurred_at >= NOW() - INTERVAL '30 days'
    WHERE c.status = 'ATIVO'
    GROUP BY c.profile_id, c.id, c.nome
)
SELECT 
    profile_id,
    'COLLABORATOR_INCIDENT_RATE' AS metric_key,
    'collaborator' AS entity_type,
    collaborator_id AS entity_id,
    CASE 
        WHEN total_movements > 0 
        THEN ROUND(((late_returns + repair_incidents + behavior_incidents)::numeric / total_movements::numeric) * 100, 2)
        ELSE 0
    END AS calculated_value,
    total_movements AS sample_size,
    NOW() AS period_end,
    NOW() AS calculated_at
FROM collaborator_incidents
WHERE total_movements >= 5;

ALTER VIEW public.v_calc_collaborator_incident_rate SET (security_invoker = on);

COMMENT ON VIEW public.v_calc_collaborator_incident_rate IS 
'Taxa de incidentes por colaborador.
ATUALIZADO: Inclui eventos derivados de alta severidade no cálculo.';

-- ============================================================================
-- PARTE 3: NOVAS MÉTRICAS DERIVADAS
-- ============================================================================

-- Adicionar novas métricas ao catálogo
INSERT INTO public.metric_catalog (
    metric_key, entity_type, display_name, description, unit, 
    calculation_frequency, baseline_required, alert_enabled, min_sample_size
) VALUES
(
    'PROCESS_ADHERENCE_RATE',
    'organization',
    'Taxa de Aderência ao Processo',
    'Percentual de operações executadas dentro do processo padrão (sem desvios detectados)',
    '%',
    'daily',
    TRUE,
    TRUE,
    50
),
(
    'OPERATIONAL_FRICTION_INDEX',
    'organization',
    'Índice de Fricção Operacional',
    'Score composto indicando nível de fricção operacional detectada (trocas frequentes, padrões ineficientes)',
    'score',
    'daily',
    TRUE,
    TRUE,
    20
)
ON CONFLICT (metric_key) DO NOTHING;

-- View de cálculo: Process Adherence Rate
CREATE OR REPLACE VIEW public.v_calc_process_adherence_rate AS
WITH process_events AS (
    SELECT 
        de.profile_id,
        COUNT(*) AS total_process_events,
        COUNT(CASE WHEN de.event_type = 'PROCESS_DEVIATION_DETECTED' THEN 1 END) AS deviation_events
    FROM public.domain_events de
    WHERE de.entity_type IN ('movement', 'repair', 'inventory')
      AND de.occurred_at >= NOW() - INTERVAL '7 days'
    GROUP BY de.profile_id
)
SELECT 
    profile_id,
    'PROCESS_ADHERENCE_RATE' AS metric_key,
    'organization' AS entity_type,
    profile_id AS entity_id,
    CASE 
        WHEN total_process_events > 0 
        THEN ROUND((1 - (deviation_events::numeric / total_process_events::numeric)) * 100, 2)
        ELSE 100
    END AS calculated_value,
    total_process_events AS sample_size,
    NOW() AS period_end,
    NOW() AS calculated_at
FROM process_events
WHERE total_process_events >= 50;

ALTER VIEW public.v_calc_process_adherence_rate SET (security_invoker = on);

COMMENT ON VIEW public.v_calc_process_adherence_rate IS 
'Taxa de aderência ao processo: percentual de operações sem desvios detectados.';

-- View de cálculo: Operational Friction Index
CREATE OR REPLACE VIEW public.v_calc_operational_friction_index AS
WITH friction_signals AS (
    SELECT 
        de.profile_id,
        COUNT(*) AS friction_event_count,
        AVG((de.payload->>'pattern_score')::numeric) AS avg_friction_score
    FROM public.domain_events de
    WHERE de.event_type = 'OPERATIONAL_FRICTION_SIGNAL'
      AND de.event_source = 'automation'
      AND de.occurred_at >= NOW() - INTERVAL '7 days'
    GROUP BY de.profile_id
)
SELECT 
    profile_id,
    'OPERATIONAL_FRICTION_INDEX' AS metric_key,
    'organization' AS entity_type,
    profile_id AS entity_id,
    -- Normalizar para 0-100 scale
    LEAST(100, ROUND((friction_event_count * avg_friction_score * 10), 2))::numeric AS calculated_value,
    friction_event_count AS sample_size,
    NOW() AS period_end,
    NOW() AS calculated_at
FROM friction_signals
WHERE friction_event_count >= 3;

ALTER VIEW public.v_calc_operational_friction_index SET (security_invoker = on);

COMMENT ON VIEW public.v_calc_operational_friction_index IS 
'Índice de fricção operacional baseado em frequência e intensidade de sinais de fricção.';

-- ============================================================================
-- PARTE 4: ATUALIZAR fn_calculate_metric PARA NOVAS MÉTRICAS
-- ============================================================================

-- Estender função de cálculo de métricas para incluir novas métricas
CREATE OR REPLACE FUNCTION public.fn_calculate_metric(
    p_metric_key TEXT,
    p_profile_id UUID,
    p_entity_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_calculated_value NUMERIC;
    v_sample_size INTEGER;
    v_confidence TEXT;
    v_metric_id UUID;
    v_catalog RECORD;
BEGIN
    -- Buscar catálogo da métrica
    SELECT * INTO v_catalog FROM public.metric_catalog WHERE metric_key = p_metric_key;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Metric not found: ' || p_metric_key);
    END IF;
    
    -- Calcular baseado no tipo de métrica
    CASE p_metric_key
        WHEN 'INVENTORY_DIVERGENCE_RATE' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_inventory_divergence_rate
            WHERE profile_id = p_profile_id
            ORDER BY period_end DESC LIMIT 1;
            
        WHEN 'TOOL_AVG_RETURN_DELAY' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_tool_return_delay
            WHERE profile_id = p_profile_id;
            
        WHEN 'VEHICLE_COST_PER_KM' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_vehicle_cost_per_km
            WHERE profile_id = p_profile_id 
              AND (p_entity_id IS NULL OR entity_id = p_entity_id)
            ORDER BY calculated_at DESC LIMIT 1;
            
        WHEN 'COLLABORATOR_INCIDENT_RATE' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_collaborator_incident_rate
            WHERE profile_id = p_profile_id
              AND (p_entity_id IS NULL OR entity_id = p_entity_id)
            ORDER BY calculated_at DESC LIMIT 1;
            
        WHEN 'VEHICLE_MAINTENANCE_FREQUENCY' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_vehicle_maintenance_frequency
            WHERE profile_id = p_profile_id
              AND (p_entity_id IS NULL OR entity_id = p_entity_id)
            ORDER BY calculated_at DESC LIMIT 1;
            
        WHEN 'OPERATIONAL_PRESSURE_INDEX' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_operational_pressure_index
            WHERE profile_id = p_profile_id;
        
        -- NOVAS MÉTRICAS
        WHEN 'PROCESS_ADHERENCE_RATE' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_process_adherence_rate
            WHERE profile_id = p_profile_id;
            
        WHEN 'OPERATIONAL_FRICTION_INDEX' THEN
            SELECT calculated_value, sample_size INTO v_calculated_value, v_sample_size
            FROM public.v_calc_operational_friction_index
            WHERE profile_id = p_profile_id;
            
        ELSE
            RETURN jsonb_build_object('success', FALSE, 'error', 'Calculation not implemented for: ' || p_metric_key);
    END CASE;
    
    -- Verificar se calculou
    IF v_calculated_value IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'No data available for calculation');
    END IF;
    
    -- Determinar nível de confiança
    v_confidence := CASE 
        WHEN v_sample_size >= v_catalog.min_sample_size * 3 THEN 'HIGH'
        WHEN v_sample_size >= v_catalog.min_sample_size THEN 'MEDIUM'
        ELSE 'LOW'
    END;
    
    -- Marcar métricas anteriores como não atuais
    UPDATE public.derived_metrics 
    SET is_current = FALSE 
    WHERE profile_id = p_profile_id 
      AND metric_key = p_metric_key
      AND (p_entity_id IS NULL OR entity_id = p_entity_id)
      AND is_current = TRUE;
    
    -- Inserir nova métrica
    INSERT INTO public.derived_metrics (
        profile_id, metric_key, entity_type, entity_id, value, 
        confidence_level, calculation_version, based_on_event_count, is_current
    ) VALUES (
        p_profile_id, p_metric_key, v_catalog.entity_type, p_entity_id, v_calculated_value,
        v_confidence, '2.0', v_sample_size, TRUE
    ) RETURNING id INTO v_metric_id;
    
    -- Retornar resultado
    v_result := jsonb_build_object(
        'success', TRUE,
        'metric_key', p_metric_key,
        'value', v_calculated_value,
        'confidence', v_confidence,
        'sample_size', v_sample_size,
        'metric_id', v_metric_id,
        'calculated_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_calculate_metric IS 
'Calcula uma métrica específica e salva em derived_metrics.
ATUALIZADO: Inclui novas métricas PROCESS_ADHERENCE_RATE e OPERATIONAL_FRICTION_INDEX.';

-- ============================================================================
-- PARTE 5: FILTRAR ALERTAS POR SEVERIDADE
-- ============================================================================

-- Atualizar função de detecção de desvio para filtrar alertas por severidade
CREATE OR REPLACE FUNCTION public.fn_detect_deviation(
    p_metric_key TEXT,
    p_profile_id UUID,
    p_entity_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_catalog RECORD;
    v_baseline RECORD;
    v_current_metric RECORD;
    v_deviation_score NUMERIC;
    v_severity TEXT;
    v_explanation TEXT;
    v_alert_id UUID;
    v_should_alert BOOLEAN := FALSE;
BEGIN
    -- Buscar catálogo
    SELECT * INTO v_catalog FROM public.metric_catalog WHERE metric_key = p_metric_key;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Metric not found');
    END IF;
    
    -- Verificar se alertas estão habilitados
    IF NOT v_catalog.alert_enabled THEN
        RETURN jsonb_build_object('success', TRUE, 'message', 'Alerts disabled for this metric');
    END IF;
    
    -- Buscar métrica atual
    SELECT * INTO v_current_metric
    FROM public.derived_metrics
    WHERE profile_id = p_profile_id
      AND metric_key = p_metric_key
      AND (p_entity_id IS NULL OR entity_id = p_entity_id)
      AND is_current = TRUE
    ORDER BY calculated_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'No current metric found');
    END IF;
    
    -- Buscar baseline
    SELECT * INTO v_baseline
    FROM public.operational_baselines
    WHERE profile_id = p_profile_id
      AND metric_key = p_metric_key
      AND is_active = TRUE;
    
    IF NOT FOUND AND v_catalog.baseline_required THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Baseline required but not found');
    END IF;
    
    -- Calcular deviation score (z-score se tiver std_dev, senão heurístico)
    IF v_baseline.standard_deviation > 0 THEN
        v_deviation_score := ABS(v_current_metric.value - v_baseline.expected_avg) / v_baseline.standard_deviation;
    ELSIF v_baseline.expected_avg > 0 THEN
        v_deviation_score := ABS(v_current_metric.value - v_baseline.expected_avg) / v_baseline.expected_avg * 3;
    ELSE
        v_deviation_score := 0;
    END IF;
    
    -- Determinar severidade
    v_severity := CASE 
        WHEN v_deviation_score >= 4 THEN 'CRITICAL'
        WHEN v_deviation_score >= 3 THEN 'HIGH'
        WHEN v_deviation_score >= 2 THEN 'MEDIUM'
        WHEN v_deviation_score >= 1.5 THEN 'LOW'
        ELSE NULL
    END;
    
    -- FILTRO: Apenas alertar para HIGH e CRITICAL
    IF v_severity IN ('HIGH', 'CRITICAL') THEN
        v_should_alert := TRUE;
        
        -- Gerar explicação
        v_explanation := format(
            '%s detectou valor %.2f, %s o esperado (%.2f). Desvio de %.1f desvios padrão. %s',
            v_catalog.display_name,
            v_current_metric.value,
            CASE WHEN v_current_metric.value > v_baseline.expected_avg THEN 'acima de' ELSE 'abaixo de' END,
            v_baseline.expected_avg,
            v_deviation_score,
            CASE v_severity
                WHEN 'CRITICAL' THEN 'Requer atenção imediata.'
                WHEN 'HIGH' THEN 'Recomenda-se investigação.'
                ELSE 'Monitorar nos próximos dias.'
            END
        );
        
        -- Verificar se já existe alerta ativo similar
        IF NOT EXISTS (
            SELECT 1 FROM public.operational_alerts
            WHERE profile_id = p_profile_id
              AND metric_key = p_metric_key
              AND (p_entity_id IS NULL OR entity_id = p_entity_id)
              AND is_active = TRUE
              AND detected_at >= NOW() - INTERVAL '24 hours'
        ) THEN
            -- Inserir alerta
            INSERT INTO public.operational_alerts (
                profile_id, metric_key, entity_type, entity_id,
                observed_value, expected_min, expected_max, expected_avg, deviation_score,
                severity, explanation, context_metadata
            ) VALUES (
                p_profile_id, p_metric_key, v_catalog.entity_type, p_entity_id,
                v_current_metric.value, v_baseline.expected_min, v_baseline.expected_max, 
                v_baseline.expected_avg, v_deviation_score,
                v_severity, v_explanation,
                jsonb_build_object(
                    'metric_id', v_current_metric.id,
                    'baseline_sample_size', v_baseline.sample_size,
                    'confidence_level', v_current_metric.confidence_level
                )
            ) RETURNING id INTO v_alert_id;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'metric_key', p_metric_key,
        'current_value', v_current_metric.value,
        'expected_avg', v_baseline.expected_avg,
        'deviation_score', ROUND(v_deviation_score, 2),
        'severity', v_severity,
        'alert_created', v_alert_id IS NOT NULL,
        'alert_id', v_alert_id,
        'explanation', v_explanation
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_detect_deviation IS 
'Detecta desvios comparando métrica atual vs baseline.
ATUALIZADO: Apenas cria alertas para severidade HIGH e CRITICAL (filtra LOW e MEDIUM).';

-- ============================================================================
-- PARTE 6: GRANTS
-- ============================================================================

GRANT SELECT ON public.v_calc_process_adherence_rate TO authenticated;
GRANT SELECT ON public.v_calc_operational_friction_index TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
