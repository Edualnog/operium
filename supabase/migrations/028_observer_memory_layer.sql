-- Migration: 028_observer_memory_layer.sql
-- Description: Cria camada de "Memória" (Feature Store) para Collaborators, Assets e Orgs.
-- Context: Agrega histórico em perfis comportamentais para uso analítico futuro (previsão/benchmark).
-- Depends on: 026_observer_analytical_views.sql

-- 1. MEMORY: COLABORADORES
-- Perfil comportamental resumido do colaborador.
CREATE OR REPLACE VIEW analytics.memory_collaborators AS
SELECT
    b.colaborador_id,
    b.profile_id,
    
    -- Metrics de Confiança
    CASE 
        WHEN b.total_operations < 5 THEN 'UNKNOWN'
        WHEN b.long_retention_rate > 0.3 THEN 'LOW_TRUST' -- Atrasos frequentes
        WHEN b.long_retention_rate < 0.05 THEN 'HIGH_TRUST'
        ELSE 'MEDIUM_TRUST'
    END AS trust_level,
    
    (1 - b.long_retention_rate)::numeric(5,4) AS reliability_score, -- 1.0 = Perfeito
    
    -- Hábitos
    b.avg_possession_hours,
    c.cargo,
    
    -- Intensidade (Operações por semana desde a primeira atividade)
    (b.total_operations::numeric / NULLIF(EXTRACT(DAYS FROM (NOW() - b.last_interaction) + INTERVAL '1 day') / 7, 0))::numeric(10,2) AS weekly_intensity

FROM analytics.collaborator_behavior b
JOIN public.colaboradores c ON b.colaborador_id = c.id;

COMMENT ON VIEW analytics.memory_collaborators IS 'Memória do Colaborador: Confiabilidade, Hábito e Intensidade.';


-- 2. MEMORY: ASSETS (ATIVOS)
-- Perfil de vida e degradação do ativo.
CREATE OR REPLACE VIEW analytics.memory_assets AS
SELECT
    h.ferramenta_id,
    h.profile_id,
    h.nome AS asset_name,
    f.categoria,
    
    -- Status de Vida
    h.health_status, -- GOOD, WARNING, CRITICAL
    
    -- KPIs Econômicos
    h.total_repair_cost,
    u.total_cycles AS usage_cycles,
    u.avg_hours_per_cycle,
    
    -- ROI Score Simplificado (Quanto mais uso com menos custo, melhor)
    -- Evita divisão por zero
    CASE 
        WHEN h.total_repair_cost = 0 THEN 100 
        ELSE (u.total_cycles * 10) / h.total_repair_cost 
    END::numeric(10,2) AS value_efficiency_score

FROM analytics.asset_health_score h
JOIN public.ferramentas f ON h.ferramenta_id = f.id
LEFT JOIN analytics.asset_usage_metrics u ON h.ferramenta_id = u.ferramenta_id;

COMMENT ON VIEW analytics.memory_assets IS 'Memória do Ativo: Saúde, Custo e Eficiência.';


-- 3. MEMORY: ORGANIZATION (EMPRESA)
-- Perfil macro operacional da empresa.
CREATE OR REPLACE VIEW analytics.memory_organization AS
WITH org_stats AS (
    SELECT 
        profile_id,
        count(*) as event_count
    FROM analytics.events_log
    GROUP BY profile_id
),
divergence_stats AS (
    SELECT
        profile_id,
        sum(total_items_diverged) as total_divergence
    FROM analytics.inventory_divergence_heatmap
    GROUP BY profile_id
)
SELECT
    p.id AS profile_id,
    p.company_name,
    p.industry_segment,
    
    -- Maturidade de Dados (Volume)
    COALESCE(os.event_count, 0) AS total_history_events,
    
    -- Eficiência Operacional Inversa (Divergência por evento - quanto menor melhor)
    COALESCE(ds.total_divergence, 0) AS accumulated_divergence_count,
    
    CASE
        WHEN COALESCE(os.event_count, 0) < 100 THEN 'NOVICE'
        WHEN (COALESCE(ds.total_divergence, 0)::numeric / NULLIF(os.event_count, 0)) < 0.01 THEN 'OPTIMIZED'
        ELSE 'DEVELOPING'
    END AS operational_maturity_stage

FROM public.profiles p
LEFT JOIN org_stats os ON p.id = os.profile_id
LEFT JOIN divergence_stats ds ON p.id = ds.profile_id;

COMMENT ON VIEW analytics.memory_organization IS 'Memória da Organização: Maturidade e Eficiência Global.';

-- Grant Access
GRANT SELECT ON analytics.memory_collaborators TO authenticated;
GRANT SELECT ON analytics.memory_assets TO authenticated;
GRANT SELECT ON analytics.memory_organization TO authenticated;
