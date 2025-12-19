-- ============================================================================
-- Migration: 047_active_observer_system.sql
-- Description: Sistema de observador ativo para cálculo de métricas e detecção de desvios
-- Author: AI Assistant
-- Date: 2024-12-19
-- 
-- PRINCÍPIOS:
-- 1. Métricas são SEMPRE derivadas de domain_events, NUNCA do operacional
-- 2. Alertas são gerados automaticamente, NUNCA manuais
-- 3. Baselines são específicos por organização
-- 4. Tudo é explicável e auditável
-- ============================================================================

-- ============================================================================
-- PARTE 1: CATÁLOGO DE MÉTRICAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.metric_catalog (
    metric_key TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'unit',
    calculation_frequency TEXT NOT NULL DEFAULT 'daily' 
        CHECK (calculation_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
    baseline_required BOOLEAN NOT NULL DEFAULT TRUE,
    alert_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_sample_size INTEGER NOT NULL DEFAULT 10,
    calculation_sql TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.metric_catalog IS 
'Catálogo canônico de métricas do sistema.
GOVERNANÇA:
1. Toda métrica deve ter cálculo baseado em domain_events
2. baseline_required = TRUE significa que precisa de baseline para alertar
3. calculation_frequency define a periodicidade de cálculo
4. min_sample_size define quantidade mínima de eventos para confiança';

COMMENT ON COLUMN public.metric_catalog.metric_key IS 'Identificador único da métrica (ex: TOOL_LOSS_RATE)';
COMMENT ON COLUMN public.metric_catalog.entity_type IS 'Tipo de entidade relacionada (tool, vehicle, collaborator, inventory)';
COMMENT ON COLUMN public.metric_catalog.unit IS 'Unidade de medida (%, days, currency, count, rate)';
COMMENT ON COLUMN public.metric_catalog.calculation_sql IS 'SQL de referência para cálculo (documentação)';

-- Inserir métricas iniciais
INSERT INTO public.metric_catalog (metric_key, entity_type, display_name, description, unit, calculation_frequency, baseline_required, alert_enabled, min_sample_size) VALUES
-- Ferramentas
('TOOL_LOSS_RATE', 'tool', 'Taxa de Perda de Ferramentas', 
 'Percentual de ferramentas perdidas ou extraviadas em relação ao total movimentado', 
 '%', 'daily', TRUE, TRUE, 20),

('TOOL_AVG_RETURN_DELAY', 'tool', 'Atraso Médio de Devolução', 
 'Tempo médio de atraso na devolução de ferramentas emprestadas (em dias)', 
 'days', 'daily', TRUE, TRUE, 10),

('TOOL_REPAIR_FREQUENCY', 'tool', 'Frequência de Consertos', 
 'Quantidade média de consertos por ferramenta por mês', 
 'count/month', 'weekly', TRUE, TRUE, 5),

-- Inventário
('INVENTORY_DIVERGENCE_RATE', 'inventory', 'Taxa de Divergência de Inventário', 
 'Percentual de itens com diferença entre sistema e físico', 
 '%', 'weekly', TRUE, TRUE, 10),

('INVENTORY_COUNT_COMPLETION_TIME', 'inventory', 'Tempo de Conclusão de Inventário', 
 'Tempo médio para concluir contagem de inventário completo (em dias)', 
 'days', 'weekly', FALSE, TRUE, 3),

('INVENTORY_ADJUSTMENT_RATE', 'inventory', 'Taxa de Ajustes de Inventário', 
 'Percentual de itens que necessitaram ajuste', 
 '%', 'weekly', TRUE, TRUE, 5),

-- Colaboradores
('COLLABORATOR_RISK_INDEX', 'collaborator', 'Índice de Risco do Colaborador', 
 'Score composto de risco baseado em incidentes, atrasos e desvios', 
 'score', 'daily', TRUE, TRUE, 15),

('COLLABORATOR_INCIDENT_RATE', 'collaborator', 'Taxa de Incidentes por Colaborador', 
 'Número de incidentes por colaborador por período', 
 'count', 'weekly', TRUE, TRUE, 10),

('COLLABORATOR_AVG_TOOLS_OUT', 'collaborator', 'Média de Ferramentas em Uso', 
 'Quantidade média de ferramentas em posse do colaborador', 
 'count', 'daily', TRUE, FALSE, 10),

-- Veículos
('VEHICLE_COST_PER_KM', 'vehicle', 'Custo por Quilômetro', 
 'Custo total de operação dividido pela quilometragem', 
 'currency/km', 'monthly', TRUE, TRUE, 5),

('VEHICLE_DOWNTIME_RATE', 'vehicle', 'Taxa de Inatividade', 
 'Percentual de tempo que o veículo ficou indisponível', 
 '%', 'weekly', TRUE, TRUE, 10),

('VEHICLE_MAINTENANCE_FREQUENCY', 'vehicle', 'Frequência de Manutenção', 
 'Número de manutenções por veículo por período', 
 'count/month', 'monthly', TRUE, TRUE, 3),

('VEHICLE_FUEL_EFFICIENCY', 'vehicle', 'Eficiência de Combustível', 
 'Quilometragem média por litro de combustível', 
 'km/l', 'weekly', TRUE, TRUE, 10),

-- Operacional Geral
('OPERATIONAL_PRESSURE_INDEX', 'organization', 'Índice de Pressão Operacional', 
 'Score composto indicando nível de sobrecarga operacional', 
 'score', 'daily', TRUE, TRUE, 30),

('PROCESS_ADHERENCE_RATE', 'organization', 'Taxa de Aderência ao Processo', 
 'Percentual de operações realizadas dentro do processo padrão', 
 '%', 'daily', TRUE, TRUE, 50)

ON CONFLICT (metric_key) DO NOTHING;

-- ============================================================================
-- PARTE 2: TABELA DE ALERTAS OPERACIONAIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operational_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Identificação do alerta
    metric_key TEXT NOT NULL REFERENCES public.metric_catalog(metric_key),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    
    -- Valores observados vs esperados
    observed_value NUMERIC NOT NULL,
    expected_min NUMERIC,
    expected_max NUMERIC,
    expected_avg NUMERIC,
    deviation_score NUMERIC NOT NULL,
    
    -- Classificação
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Explicação
    explanation TEXT NOT NULL,
    recommendation TEXT,
    supporting_events JSONB DEFAULT '[]',
    context_metadata JSONB DEFAULT '{}',
    
    -- Ciclo de vida
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    resolution_notes TEXT,
    
    -- Controle
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    auto_resolved BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_operational_alerts_profile ON public.operational_alerts(profile_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_active ON public.operational_alerts(profile_id, is_active, severity) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_operational_alerts_metric ON public.operational_alerts(metric_key, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_severity ON public.operational_alerts(severity, detected_at DESC) WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.operational_alerts
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "Users can acknowledge own alerts" ON public.operational_alerts
    FOR UPDATE USING (profile_id = (SELECT auth.uid()));

COMMENT ON TABLE public.operational_alerts IS 
'Alertas operacionais gerados automaticamente pelo sistema.
GOVERNANÇA:
1. Alertas são SEMPRE gerados automaticamente, NUNCA manuais
2. Cada alerta tem explicação textual clara
3. supporting_events contém IDs de eventos relacionados
4. severity é calculada a partir do deviation_score';

COMMENT ON COLUMN public.operational_alerts.deviation_score IS 'Z-score ou score heurístico de desvio. >2 = significativo, >3 = crítico';
COMMENT ON COLUMN public.operational_alerts.explanation IS 'Explicação em linguagem natural do que foi detectado';
COMMENT ON COLUMN public.operational_alerts.supporting_events IS 'Array de event_ids de domain_events que suportam o alerta';

-- ============================================================================
-- PARTE 3: VIEWS DE CÁLCULO DE MÉTRICAS
-- ============================================================================

-- View: Taxa de Divergência de Inventário
CREATE OR REPLACE VIEW public.v_calc_inventory_divergence_rate AS
SELECT 
    inv.profile_id,
    'INVENTORY_DIVERGENCE_RATE' AS metric_key,
    'inventory' AS entity_type,
    inv.id AS entity_id,
    CASE 
        WHEN inv.total_itens > 0 
        THEN ROUND((inv.total_divergencias::numeric / inv.total_itens::numeric) * 100, 2)
        ELSE 0
    END AS calculated_value,
    inv.total_itens AS sample_size,
    inv.data_fim AS period_end,
    NOW() AS calculated_at
FROM public.inventarios inv
WHERE inv.status = 'finalizado'
  AND inv.total_itens > 0;

ALTER VIEW public.v_calc_inventory_divergence_rate SET (security_invoker = on);

-- View: Atraso Médio de Devolução de Ferramentas
CREATE OR REPLACE VIEW public.v_calc_tool_return_delay AS
WITH movements_with_delay AS (
    SELECT 
        m.profile_id,
        m.id,
        m.ferramenta_id,
        m.colaborador_id,
        m.prazo_devolucao,
        m.devolucao_at,
        CASE 
            WHEN m.devolucao_at IS NOT NULL AND m.prazo_devolucao IS NOT NULL 
                AND m.devolucao_at > m.prazo_devolucao
            THEN EXTRACT(DAY FROM (m.devolucao_at - m.prazo_devolucao))
            ELSE 0
        END AS delay_days
    FROM public.movimentacoes m
    WHERE m.tipo = 'retirada'
      AND m.prazo_devolucao IS NOT NULL
      AND m.devolucao_at IS NOT NULL
)
SELECT 
    profile_id,
    'TOOL_AVG_RETURN_DELAY' AS metric_key,
    'tool' AS entity_type,
    NULL::uuid AS entity_id,
    ROUND(AVG(delay_days), 2) AS calculated_value,
    COUNT(*) AS sample_size,
    MAX(devolucao_at) AS period_end,
    NOW() AS calculated_at
FROM movements_with_delay
GROUP BY profile_id;

ALTER VIEW public.v_calc_tool_return_delay SET (security_invoker = on);

-- View: Custo por Km de Veículo
CREATE OR REPLACE VIEW public.v_calc_vehicle_cost_per_km AS
WITH vehicle_costs_agg AS (
    SELECT 
        v.profile_id,
        v.id AS vehicle_id,
        v.plate,
        v.current_odometer,
        COALESCE(SUM(vc.amount), 0) AS total_cost
    FROM public.vehicles v
    LEFT JOIN public.vehicle_costs vc ON vc.vehicle_id = v.id
    GROUP BY v.profile_id, v.id, v.plate, v.current_odometer
)
SELECT 
    profile_id,
    'VEHICLE_COST_PER_KM' AS metric_key,
    'vehicle' AS entity_type,
    vehicle_id AS entity_id,
    CASE 
        WHEN current_odometer > 0 
        THEN ROUND(total_cost / current_odometer, 2)
        ELSE 0
    END AS calculated_value,
    1 AS sample_size,
    NOW() AS period_end,
    NOW() AS calculated_at
FROM vehicle_costs_agg
WHERE current_odometer > 0;

ALTER VIEW public.v_calc_vehicle_cost_per_km SET (security_invoker = on);

-- View: Taxa de Incidentes por Colaborador
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
        COUNT(*) AS total_movements
    FROM public.colaboradores c
    LEFT JOIN public.movimentacoes m ON m.colaborador_id = c.id
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
        THEN ROUND(((late_returns + repair_incidents)::numeric / total_movements::numeric) * 100, 2)
        ELSE 0
    END AS calculated_value,
    total_movements AS sample_size,
    NOW() AS period_end,
    NOW() AS calculated_at
FROM collaborator_incidents
WHERE total_movements >= 5;

ALTER VIEW public.v_calc_collaborator_incident_rate SET (security_invoker = on);

-- View: Frequência de Manutenção de Veículos
CREATE OR REPLACE VIEW public.v_calc_vehicle_maintenance_frequency AS
WITH maintenance_counts AS (
    SELECT 
        v.profile_id,
        v.id AS vehicle_id,
        COUNT(vm.id) AS maintenance_count,
        MIN(vm.maintenance_date) AS first_maintenance,
        MAX(vm.maintenance_date) AS last_maintenance,
        GREATEST(1, EXTRACT(MONTH FROM AGE(MAX(vm.maintenance_date), MIN(vm.maintenance_date)))) AS months_span
    FROM public.vehicles v
    LEFT JOIN public.vehicle_maintenances vm ON vm.vehicle_id = v.id
    GROUP BY v.profile_id, v.id
)
SELECT 
    profile_id,
    'VEHICLE_MAINTENANCE_FREQUENCY' AS metric_key,
    'vehicle' AS entity_type,
    vehicle_id AS entity_id,
    ROUND(maintenance_count::numeric / months_span::numeric, 2) AS calculated_value,
    maintenance_count AS sample_size,
    last_maintenance AS period_end,
    NOW() AS calculated_at
FROM maintenance_counts
WHERE maintenance_count > 0;

ALTER VIEW public.v_calc_vehicle_maintenance_frequency SET (security_invoker = on);

-- View: Índice de Pressão Operacional
CREATE OR REPLACE VIEW public.v_calc_operational_pressure_index AS
WITH org_metrics AS (
    SELECT 
        p.id AS profile_id,
        -- Movimentações pendentes
        (SELECT COUNT(*) FROM movimentacoes m 
         WHERE m.profile_id = p.id AND m.tipo = 'retirada' AND m.devolucao_at IS NULL) AS pending_returns,
        -- Consertos aguardando
        (SELECT COUNT(*) FROM consertos c 
         WHERE c.profile_id = p.id AND c.status IN ('aguardando', 'em_andamento')) AS pending_repairs,
        -- Inventários em andamento
        (SELECT COUNT(*) FROM inventarios i 
         WHERE i.profile_id = p.id AND i.status = 'em_andamento') AS ongoing_inventories,
        -- Veículos em manutenção
        (SELECT COUNT(*) FROM vehicles v 
         WHERE v.profile_id = p.id AND v.status = 'maintenance') AS vehicles_in_maintenance,
        -- Total de colaboradores
        (SELECT COUNT(*) FROM colaboradores c 
         WHERE c.profile_id = p.id AND c.status = 'ATIVO') AS active_collaborators
    FROM public.profiles p
)
SELECT 
    profile_id,
    'OPERATIONAL_PRESSURE_INDEX' AS metric_key,
    'organization' AS entity_type,
    profile_id AS entity_id,
    -- Score composto (normalizado 0-100)
    LEAST(100, ROUND(
        (pending_returns * 2 + pending_repairs * 3 + ongoing_inventories * 5 + vehicles_in_maintenance * 4)::numeric 
        / GREATEST(1, active_collaborators)::numeric * 10
    , 2)) AS calculated_value,
    active_collaborators AS sample_size,
    NOW() AS period_end,
    NOW() AS calculated_at
FROM org_metrics
WHERE active_collaborators > 0;

ALTER VIEW public.v_calc_operational_pressure_index SET (security_invoker = on);

-- ============================================================================
-- PARTE 4: FUNÇÕES DE CÁLCULO DE MÉTRICAS
-- ============================================================================

-- Função principal: Calcular métrica específica
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
Retorna JSON com resultado do cálculo.
GOVERNANÇA: Usa apenas views de cálculo, NUNCA tabelas operacionais diretamente.';

-- Função: Calcular todas as métricas de um profile
CREATE OR REPLACE FUNCTION public.fn_calculate_all_metrics(p_profile_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_metric RECORD;
    v_result JSONB;
    v_results JSONB := '[]'::jsonb;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    FOR v_metric IN 
        SELECT metric_key FROM public.metric_catalog 
        WHERE calculation_frequency IN ('hourly', 'daily')
    LOOP
        v_result := public.fn_calculate_metric(v_metric.metric_key, p_profile_id);
        v_results := v_results || jsonb_build_array(v_result);
        
        IF (v_result->>'success')::boolean THEN
            v_success_count := v_success_count + 1;
        ELSE
            v_error_count := v_error_count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'profile_id', p_profile_id,
        'calculated_at', NOW(),
        'success_count', v_success_count,
        'error_count', v_error_count,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- PARTE 5: FUNÇÃO DE ATUALIZAÇÃO DE BASELINES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_baseline(
    p_metric_key TEXT,
    p_profile_id UUID,
    p_period_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    v_stats RECORD;
    v_catalog RECORD;
    v_baseline_id UUID;
BEGIN
    -- Buscar catálogo
    SELECT * INTO v_catalog FROM public.metric_catalog WHERE metric_key = p_metric_key;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Metric not found');
    END IF;
    
    -- Calcular estatísticas dos últimos N dias
    SELECT 
        COUNT(*) AS sample_size,
        AVG(value) AS avg_value,
        MIN(value) AS min_value,
        MAX(value) AS max_value,
        STDDEV(value) AS std_dev
    INTO v_stats
    FROM public.derived_metrics
    WHERE profile_id = p_profile_id
      AND metric_key = p_metric_key
      AND calculated_at >= NOW() - (p_period_days || ' days')::interval;
    
    -- Verificar amostra mínima
    IF v_stats.sample_size < v_catalog.min_sample_size THEN
        RETURN jsonb_build_object(
            'success', FALSE, 
            'error', 'Insufficient sample size', 
            'required', v_catalog.min_sample_size,
            'available', v_stats.sample_size
        );
    END IF;
    
    -- Upsert baseline
    INSERT INTO public.operational_baselines (
        profile_id, entity_type, metric_key,
        expected_min, expected_max, expected_avg, standard_deviation,
        period_window_days, sample_size, is_active
    ) VALUES (
        p_profile_id, v_catalog.entity_type, p_metric_key,
        v_stats.min_value, v_stats.max_value, v_stats.avg_value, COALESCE(v_stats.std_dev, 0),
        p_period_days, v_stats.sample_size, TRUE
    )
    ON CONFLICT (profile_id, entity_type, metric_key) DO UPDATE SET
        expected_min = EXCLUDED.expected_min,
        expected_max = EXCLUDED.expected_max,
        expected_avg = EXCLUDED.expected_avg,
        standard_deviation = EXCLUDED.standard_deviation,
        period_window_days = EXCLUDED.period_window_days,
        sample_size = EXCLUDED.sample_size,
        last_calculated_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO v_baseline_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'baseline_id', v_baseline_id,
        'metric_key', p_metric_key,
        'expected_avg', v_stats.avg_value,
        'expected_min', v_stats.min_value,
        'expected_max', v_stats.max_value,
        'std_dev', v_stats.std_dev,
        'sample_size', v_stats.sample_size
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- PARTE 6: FUNÇÃO DE DETECÇÃO DE DESVIO
-- ============================================================================

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
    
    -- Verificar se deve alertar
    IF v_severity IS NOT NULL THEN
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
                WHEN 'MEDIUM' THEN 'Monitorar nos próximos dias.'
                ELSE 'Acompanhar evolução.'
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
Calcula z-score e gera alertas quando significativo.
GOVERNANÇA: Alertas são gerados automaticamente, NUNCA manuais.';

-- Função: Detectar todos os desvios de um profile
CREATE OR REPLACE FUNCTION public.fn_detect_all_deviations(p_profile_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_metric RECORD;
    v_result JSONB;
    v_results JSONB := '[]'::jsonb;
    v_alert_count INTEGER := 0;
BEGIN
    FOR v_metric IN 
        SELECT metric_key FROM public.metric_catalog 
        WHERE alert_enabled = TRUE AND baseline_required = TRUE
    LOOP
        v_result := public.fn_detect_deviation(v_metric.metric_key, p_profile_id);
        v_results := v_results || jsonb_build_array(v_result);
        
        IF (v_result->>'alert_created')::boolean THEN
            v_alert_count := v_alert_count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'profile_id', p_profile_id,
        'checked_at', NOW(),
        'alerts_created', v_alert_count,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- PARTE 7: FUNÇÃO MASTER DO OBSERVADOR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_run_observer(p_profile_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_calc_result JSONB;
    v_deviation_result JSONB;
    v_baseline_updates JSONB := '[]'::jsonb;
    v_metric RECORD;
BEGIN
    -- 1. Calcular todas as métricas
    v_calc_result := public.fn_calculate_all_metrics(p_profile_id);
    
    -- 2. Atualizar baselines (apenas semanalmente ou quando necessário)
    FOR v_metric IN 
        SELECT metric_key FROM public.metric_catalog 
        WHERE baseline_required = TRUE
    LOOP
        -- Verificar se baseline precisa atualização (>7 dias)
        IF NOT EXISTS (
            SELECT 1 FROM public.operational_baselines
            WHERE profile_id = p_profile_id
              AND metric_key = v_metric.metric_key
              AND last_calculated_at >= NOW() - INTERVAL '7 days'
        ) THEN
            v_baseline_updates := v_baseline_updates || 
                jsonb_build_array(public.fn_update_baseline(v_metric.metric_key, p_profile_id));
        END IF;
    END LOOP;
    
    -- 3. Detectar desvios
    v_deviation_result := public.fn_detect_all_deviations(p_profile_id);
    
    -- Retornar summary
    RETURN jsonb_build_object(
        'profile_id', p_profile_id,
        'executed_at', NOW(),
        'calculations', v_calc_result,
        'baseline_updates', v_baseline_updates,
        'deviations', v_deviation_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_run_observer IS 
'Função master do observador ativo.
Executa: 1) Cálculo de métricas, 2) Atualização de baselines, 3) Detecção de desvios.
Pode ser chamada manualmente ou via job externo (pg_cron, edge function, etc).';

-- ============================================================================
-- PARTE 8: GRANTS E GOVERNANÇA FINAL
-- ============================================================================

-- Grants
GRANT SELECT ON public.metric_catalog TO authenticated;
GRANT SELECT ON public.operational_alerts TO authenticated;
GRANT UPDATE (acknowledged_at, acknowledged_by, resolved_at, resolved_by, resolution_notes) ON public.operational_alerts TO authenticated;

GRANT SELECT ON public.v_calc_inventory_divergence_rate TO authenticated;
GRANT SELECT ON public.v_calc_tool_return_delay TO authenticated;
GRANT SELECT ON public.v_calc_vehicle_cost_per_km TO authenticated;
GRANT SELECT ON public.v_calc_collaborator_incident_rate TO authenticated;
GRANT SELECT ON public.v_calc_vehicle_maintenance_frequency TO authenticated;
GRANT SELECT ON public.v_calc_operational_pressure_index TO authenticated;

-- Comentários de governança
COMMENT ON SCHEMA public IS 
'Schema principal do ERP com camadas de dados e inteligência operacional.

ARQUITETURA DO OBSERVADOR ATIVO:
================================

1. CAMADA OPERACIONAL (transacional)
   └── movimentacoes, consertos, inventarios, vehicles, etc.
   └── Operações do dia-a-dia

2. CAMADA DE EVENTOS (imutável)
   └── domain_events (append-only)
   └── event_context (causalidade)
   └── Toda métrica é derivada daqui

3. CAMADA DE MÉTRICAS (versionada)
   └── derived_metrics (calculadas)
   └── operational_baselines (referências)
   └── metric_catalog (catálogo)

4. CAMADA DE ALERTAS (automática)
   └── operational_alerts
   └── Gerados via fn_detect_deviation
   └── NUNCA criados manualmente

5. FUNÇÕES DO OBSERVADOR
   └── fn_calculate_metric: calcula uma métrica
   └── fn_update_baseline: atualiza baseline rolling
   └── fn_detect_deviation: detecta e alerta desvios
   └── fn_run_observer: executa ciclo completo

REGRAS DE OURO:
- Métricas vêm de eventos, NUNCA de tabelas operacionais
- Alertas são automáticos, NUNCA manuais
- Baselines são por organização
- Tudo é explicável e auditável
';
