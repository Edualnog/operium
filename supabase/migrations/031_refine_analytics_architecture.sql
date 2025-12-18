-- Migration: 031_refine_analytics_architecture.sql
-- Description: Centraliza configurações de analytics e cria View de Sessões.
-- Context: Refinamento da arquitetura "Observer" para remover magic numbers e permitir análise de produtividade.

-- 1. CONFIGURATION VIEW
-- Centraliza "magic numbers" em um único local para fácil ajuste e auditoria.
CREATE OR REPLACE VIEW analytics.config AS
SELECT
    48 AS long_retention_threshold_hours, -- Era hardcoded em collaborator_behavior
    30 AS session_timeout_minutes,        -- Novo parametro para sessions_log
    5  AS lemon_asset_critical_threshold, -- Era hardcoded em asset_health_score
    2  AS lemon_asset_warning_threshold   -- Era hardcoded em asset_health_score
;

COMMENT ON VIEW analytics.config IS 'Configuração centralizada para Views de Analytics (Configuration as Code).';
GRANT SELECT ON analytics.config TO authenticated;


-- 2. REFACTOR: COLLABORATOR BEHAVIOR
-- Remove hardcoded '48' e usa config.
CREATE OR REPLACE VIEW analytics.collaborator_behavior AS
WITH config AS (
    SELECT long_retention_threshold_hours FROM analytics.config
),
cycles AS (
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
    
    -- Delay Score parametrizado
    (COUNT(*) FILTER (WHERE cy.duration_hours > (SELECT long_retention_threshold_hours FROM config))::numeric / NULLIF(COUNT(*), 0))::numeric(5,2) AS long_retention_rate,
    
    MAX(m.data) AS last_interaction
FROM public.colaboradores c
LEFT JOIN cycles cy ON c.id = cy.actor_id
LEFT JOIN public.movimentacoes m ON c.id = m.colaborador_id
GROUP BY c.id, c.nome, c.profile_id;


-- 3. REFACTOR: ASSET HEALTH SCORE
-- Remove hardcoded '5' e '2' e usa config.
CREATE OR REPLACE VIEW analytics.asset_health_score AS
WITH config AS (
    SELECT lemon_asset_critical_threshold, lemon_asset_warning_threshold FROM analytics.config
)
SELECT
    f.id AS ferramenta_id,
    f.nome,
    f.profile_id,
    
    COUNT(c.id) AS total_repairs,
    SUM(c.custo) AS total_repair_cost,
    MAX(c.data_envio) AS last_repair_date,
    
    -- Saúde Calculada Parametrizada
    CASE 
        WHEN COUNT(c.id) > (SELECT lemon_asset_critical_threshold FROM config) THEN 'CRITICAL'
        WHEN COUNT(c.id) > (SELECT lemon_asset_warning_threshold FROM config) THEN 'WARNING'
        ELSE 'GOOD'
    END AS health_status,
    
    CASE 
        WHEN COUNT(c.id) > 1 THEN 
            (EXTRACT(EPOCH FROM (MAX(c.data_envio) - MIN(c.data_envio))) / 86400) / (COUNT(c.id) - 1)
        ELSE NULL 
    END::numeric(10,1) AS avg_days_between_repairs

FROM public.ferramentas f
LEFT JOIN public.consertos c ON f.id = c.ferramenta_id
GROUP BY f.id, f.nome, f.profile_id;


-- 4. NEW: SESSIONS LOG
-- Reconstrói sessões de trabalho baseadas em gap de tempo > 30min (config).
CREATE OR REPLACE VIEW analytics.sessions_log AS
WITH config AS (
    SELECT session_timeout_minutes FROM analytics.config
),
events_with_lag AS (
    SELECT
        event_id,
        profile_id,
        actor_id,
        timestamp,
        category,
        LAG(timestamp) OVER (PARTITION BY actor_id ORDER BY timestamp) AS prev_timestamp
    FROM analytics.events_log
    WHERE actor_id IS NOT NULL -- Sessão requer um Humano
),
session_flags AS (
    SELECT
        *,
        CASE 
            WHEN prev_timestamp IS NULL THEN 1
            WHEN EXTRACT(EPOCH FROM (timestamp - prev_timestamp))/60 > (SELECT session_timeout_minutes FROM config) THEN 1
            ELSE 0
        END AS is_new_session
    FROM events_with_lag
),
session_groups AS (
    SELECT
        *,
        SUM(is_new_session) OVER (PARTITION BY actor_id ORDER BY timestamp) AS session_user_seq
    FROM session_flags
)
SELECT
    -- ID único de sessão (Actor + Seq)
    md5(CONCAT(actor_id, '_', session_user_seq)) AS session_id,
    actor_id,
    profile_id,
    
    MIN(timestamp) AS session_start,
    MAX(timestamp) AS session_end,
    (EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/60)::numeric(10,2) AS duration_minutes,
    
    COUNT(*) AS events_count,
    
    -- Atividade predominante na sessão
    MODE() WITHIN GROUP (ORDER BY category) AS main_activity_category
    
FROM session_groups
GROUP BY actor_id, profile_id, session_user_seq;

COMMENT ON VIEW analytics.sessions_log IS 'Reconstrução de sessões de trabalho humanas baseadas em time-clustering.';
GRANT SELECT ON analytics.sessions_log TO authenticated;
