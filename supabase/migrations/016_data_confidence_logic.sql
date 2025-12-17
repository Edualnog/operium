-- Migration: 016_data_confidence_logic.sql
-- Description: Implementa a lógica de DATA_CONFIDENCE (Volume, Diversidade, Estabilidade)
-- Author: Antigravity Agent (Data Architect)

-- 1. Criar Schema para Analytics (Isolamento)
CREATE SCHEMA IF NOT EXISTS analytics;

-- 2. Função Base: Métricas de Volume
-- Retorna: total_moves, weeks_active
CREATE OR REPLACE FUNCTION analytics.calculate_volume_metrics(p_profile_id UUID)
RETURNS TABLE (
    total_moves BIGINT,
    active_weeks BIGINT
) LANGUAGE sql STABLE AS $$
    SELECT 
        COUNT(*) as total_moves,
        COUNT(DISTINCT date_trunc('week', data)) as active_weeks
    FROM public.movimentacoes
    WHERE profile_id = p_profile_id;
$$;

-- 3. Função Base: Métricas de Diversidade
-- Retorna: active_actors, active_assets
CREATE OR REPLACE FUNCTION analytics.calculate_diversity_metrics(p_profile_id UUID)
RETURNS TABLE (
    active_actors BIGINT,
    active_assets BIGINT
) LANGUAGE sql STABLE AS $$
    SELECT 
        COUNT(DISTINCT colaborador_id) as active_actors,
        COUNT(DISTINCT ferramenta_id) as active_assets
    FROM public.movimentacoes
    WHERE profile_id = p_profile_id
      AND data > (NOW() - INTERVAL '180 days'); -- Rolling 6 months for diversity relevance
$$;

-- 4. Função Base: Métricas de Estabilidade
-- Retorna: correction_ratio, orphan_ratio
CREATE OR REPLACE FUNCTION analytics.calculate_stability_metrics(p_profile_id UUID)
RETURNS TABLE (
    correction_ratio NUMERIC,
    orphan_ratio NUMERIC
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_total_moves BIGINT;
    v_adjustments BIGINT;
    v_total_outs BIGINT;
    v_orphans BIGINT;
BEGIN
    -- Ratio de Ajustes
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE tipo = 'ajuste')
    INTO v_total_moves, v_adjustments
    FROM public.movimentacoes
    WHERE profile_id = p_profile_id
      AND data > (NOW() - INTERVAL '90 days'); -- Last 90 days for stability

    -- Ratio de Órfãos (Checkout sem Checkin > 2x LeadTime)
    -- Simplificação: Órfãos são retiradas sem data de devolução há mais de 30 dias (hardcoded safety)
    SELECT 
        COUNT(*) FILTER (WHERE tipo = 'retirada'),
        COUNT(*) FILTER (WHERE tipo = 'retirada' AND devolucao_at IS NULL AND data < (NOW() - INTERVAL '30 days'))
    INTO v_total_outs, v_orphans
    FROM public.movimentacoes
    WHERE profile_id = p_profile_id
      AND data > (NOW() - INTERVAL '180 days');

    RETURN QUERY SELECT 
        COALESCE((v_adjustments::NUMERIC / NULLIF(v_total_moves, 0)), 0) as correction_ratio,
        COALESCE((v_orphans::NUMERIC / NULLIF(v_total_outs, 0)), 0) as orphan_ratio;
END;
$$;

-- 5. Materialized View: Tabela de Verdade do Confidence Score
-- Esta view materializada deve ser atualizada periodicamente (ex: nightly via cron ou trigger)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.data_confidence_score AS
WITH metrics AS (
    SELECT 
        p.id as profile_id,
        v.total_moves,
        v.active_weeks,
        d.active_actors,
        d.active_assets,
        s.correction_ratio,
        s.orphan_ratio
    FROM public.profiles p
    CROSS JOIN LATERAL analytics.calculate_volume_metrics(p.id) v
    CROSS JOIN LATERAL analytics.calculate_diversity_metrics(p.id) d
    CROSS JOIN LATERAL analytics.calculate_stability_metrics(p.id) s
)
SELECT 
    profile_id,
    -- Raw Metrics (para debug/audit)
    total_moves,
    active_weeks,
    active_actors,
    active_assets,
    ROUND(correction_ratio, 4) as correction_ratio,
    ROUND(orphan_ratio, 4) as orphan_ratio,
    
    -- Calculated Score Logic (Conservative)
    CASE 
        -- HIGH Criteria
        WHEN (total_moves >= 2000 AND active_weeks >= 24) -- Volume
             AND (active_actors >= 30 AND active_assets >= 200) -- Diversity
             AND (correction_ratio <= 0.03 AND orphan_ratio <= 0.05) -- Stability
        THEN 'HIGH'
        
        -- MEDIUM Criteria
        WHEN (total_moves >= 500 AND active_weeks >= 12) -- Volume
             AND (active_actors >= 10 AND active_assets >= 50) -- Diversity
             AND (correction_ratio <= 0.10 AND orphan_ratio <= 0.10) -- Stability
        THEN 'MEDIUM'
        
        -- Default Low
        ELSE 'LOW'
    END :: text as confidence_level,
    
    NOW() as calculated_at,
    'v1.0' as algo_version

FROM metrics;

-- Index para performance de leitura
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_confidence_profile ON analytics.data_confidence_score(profile_id);

-- 6. Helper para Refresh Seguro
CREATE OR REPLACE FUNCTION analytics.refresh_confidence_scores()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.data_confidence_score;
$$;

-- Grant usage (Internal usage only, but defining for completeness)
GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON analytics.data_confidence_score TO authenticated;
-- GRANT EXECUTE ON FUNCTION analytics.refresh_confidence_scores TO authenticated; -- Optional: if we want to allow trigger-based refresh
