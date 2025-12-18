-- Migration: 026_observer_analytical_views.sql
-- Description: Views de inteligência comportamental (Tempo, Atraso, Divergência).
-- Depends on: 025_observer_event_layer.sql

-- 1. ANALYTICS: ASSET USAGE TIME (Ciclo de Uso)
-- Mede o tempo médio que cada ferramenta passa "na mão" de alguém.
CREATE OR REPLACE VIEW analytics.asset_usage_metrics AS
WITH withdrawal_events AS (
    SELECT 
        object_id AS ferramenta_id,
        actor_id AS colaborador_id,
        timestamp AS retirada_at,
        profile_id,
        LEAD(timestamp) OVER (PARTITION BY object_id, actor_id ORDER BY timestamp) AS devolucao_at,
        LEAD(action) OVER (PARTITION BY object_id, actor_id ORDER BY timestamp) AS next_action
    FROM analytics.events_log
    WHERE category = 'movimentacao' 
      AND action IN ('retirada', 'devolucao')
)
SELECT 
    ferramenta_id,
    profile_id,
    COUNT(*) AS total_cycles,
    AVG(EXTRACT(EPOCH FROM (devolucao_at - retirada_at))/3600)::numeric(10,2) AS avg_hours_per_cycle,
    MAX(EXTRACT(EPOCH FROM (devolucao_at - retirada_at))/3600)::numeric(10,2) AS max_hours_per_cycle
FROM withdrawal_events
WHERE devolucao_at IS NOT NULL 
  AND next_action = 'devolucao' -- Garante par retirada->devolucao
GROUP BY ferramenta_id, profile_id;

COMMENT ON VIEW analytics.asset_usage_metrics IS 'Métrica de intensidade de uso. Ativos com muitas horas/ciclo sofrem mais desgaste.';


-- 2. ANALYTICS: COLLABORATOR BEHAVIOR (Comportamento)
-- Identifica atrasos recorrentes e volume de responsabilidade.
-- Definição de "Atraso" (Heurística): Retenção > 48h (ajustável).
CREATE OR REPLACE VIEW analytics.collaborator_behavior AS
WITH cycles AS (
    SELECT 
        actor_id,
        profile_id,
        EXTRACT(EPOCH FROM (devolucao_at - retirada_at))/3600 AS duration_hours
    FROM (
        SELECT 
            actor_id,
            profile_id,
            timestamp AS retirada_at,
            LEAD(timestamp) OVER (PARTITION BY object_id, actor_id ORDER BY timestamp) AS devolucao_at,
            LEAD(action) OVER (PARTITION BY object_id, actor_id ORDER BY timestamp) AS next_action
        FROM analytics.events_log
        WHERE category = 'movimentacao' AND action IN ('retirada', 'devolucao')
    ) t
    WHERE devolucao_at IS NOT NULL AND next_action = 'devolucao'
)

SELECT 
    c.id AS colaborador_id,
    c.nome,
    c.profile_id,
    COUNT(cy.duration_hours) AS total_operations,
    AVG(cy.duration_hours)::numeric(10,2) AS avg_possession_hours,
    
    -- Delay Score: % de ciclos que duraram mais de 48h (fim de semana ou retenção excessiva)
    (COUNT(*) FILTER (WHERE cy.duration_hours > 48)::numeric / NULLIF(COUNT(*), 0))::numeric(5,2) AS long_retention_rate,
    
    -- Activity Recency: Ultima interação
    MAX(m.data) AS last_interaction
FROM public.colaboradores c
LEFT JOIN cycles cy ON c.id = cy.actor_id
LEFT JOIN public.movimentacoes m ON c.id = m.colaborador_id
GROUP BY c.id, c.nome, c.profile_id;

COMMENT ON VIEW analytics.collaborator_behavior IS 'Perfil de risco do colaborador. High retention rate pode indicar "hoarding" de ferramentas.';


-- 3. ANALYTICS: MAINTENANCE RECURRENCE (Ciclo de Vida)
-- Detecta ativos "problemáticos" (Lemons).
CREATE OR REPLACE VIEW analytics.asset_health_score AS
SELECT
    f.id AS ferramenta_id,
    f.nome,
    f.profile_id,
    
    -- Métricas de Manutenção
    COUNT(c.id) AS total_repairs,
    SUM(c.custo) AS total_repair_cost,
    MAX(c.data_envio) AS last_repair_date,
    
    -- Saúde Calculada
    CASE 
        WHEN COUNT(c.id) > 5 THEN 'CRITICAL'
        WHEN COUNT(c.id) > 2 THEN 'WARNING'
        ELSE 'GOOD'
    END AS health_status,
    
    -- MTBF Simplificado (Dias médios entre consertos)
    CASE 
        WHEN COUNT(c.id) > 1 THEN 
            (EXTRACT(EPOCH FROM (MAX(c.data_envio) - MIN(c.data_envio))) / 86400) / (COUNT(c.id) - 1)
        ELSE NULL 
    END::numeric(10,1) AS avg_days_between_repairs

FROM public.ferramentas f
LEFT JOIN public.consertos c ON f.id = c.ferramenta_id
GROUP BY f.id, f.nome, f.profile_id;

COMMENT ON VIEW analytics.asset_health_score IS 'Saúde do ativo baseada em histórico de manutenção. Identifica ativos que custam mais que valem.';


-- 4. ANALYTICS: INVENTORY DIVERGENCE HEATMAP
-- Onde estão ocorrendo as perdas?
CREATE OR REPLACE VIEW analytics.inventory_divergence_heatmap AS
SELECT
    i.profile_id,
    i.categoria_filtro, -- Agregado por categoria (se houver)
    
    COUNT(ia.id) AS total_adjustments,
    SUM(ABS(ia.diferenca)) AS total_items_diverged,
    SUM(CASE WHEN ia.diferenca < 0 THEN 1 ELSE 0 END) AS extraction_leaks, -- Perdas prováveis
    
    -- Motivo Principal
    MODE() WITHIN GROUP (ORDER BY ia.motivo) AS most_common_reason

FROM public.inventario_ajustes ia
JOIN public.inventario_itens ii ON ia.inventario_item_id = ii.id
JOIN public.inventarios i ON ii.inventario_id = i.id
GROUP BY i.profile_id, i.categoria_filtro;

COMMENT ON VIEW analytics.inventory_divergence_heatmap IS 'Mapa de calor de perdas. Ajuda a focar auditorias futuras.';

-- Grant access
GRANT SELECT ON analytics.asset_usage_metrics TO authenticated;
GRANT SELECT ON analytics.collaborator_behavior TO authenticated;
GRANT SELECT ON analytics.asset_health_score TO authenticated;
GRANT SELECT ON analytics.inventory_divergence_heatmap TO authenticated;
