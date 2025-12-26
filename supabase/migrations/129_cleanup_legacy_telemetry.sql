-- ============================================================================
-- Migration 129: Limpeza de Telemetria Legada (Opcional)
-- ============================================================================
-- Remove dados históricos de telemetria após migração para Cloudflare Workers.
-- SAFE: Não afeta dados operacionais (ferramentas, colaboradores, movimentações).
-- ============================================================================

-- IMPORTANTE: Execute esta migration apenas DEPOIS de validar que o sistema
-- Cloudflare está funcionando corretamente e acumulando eventos.

-- ============================================================================
-- ANÁLISE PRÉVIA (Rodar antes de deletar)
-- ============================================================================

-- Ver volume de dados em cada tabela de telemetria
DO $$
DECLARE
    domain_events_count INTEGER;
    observer_log_count INTEGER;
    execution_log_count INTEGER;
    event_context_count INTEGER;
    derived_metrics_count INTEGER;
    operational_alerts_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO domain_events_count FROM public.domain_events;
    SELECT COUNT(*) INTO observer_log_count FROM public.observer_execution_log;
    SELECT COUNT(*) INTO execution_log_count FROM public.metric_execution_log;
    SELECT COUNT(*) INTO event_context_count FROM public.event_context;
    SELECT COUNT(*) INTO derived_metrics_count FROM public.derived_metrics;
    SELECT COUNT(*) INTO operational_alerts_count FROM public.operational_alerts;

    RAISE NOTICE '=== TELEMETRIA - VOLUME DE DADOS ===';
    RAISE NOTICE 'domain_events: % registros', domain_events_count;
    RAISE NOTICE 'observer_execution_log: % registros', observer_log_count;
    RAISE NOTICE 'metric_execution_log: % registros', execution_log_count;
    RAISE NOTICE 'event_context: % registros', event_context_count;
    RAISE NOTICE 'derived_metrics: % registros', derived_metrics_count;
    RAISE NOTICE 'operational_alerts: % registros', operational_alerts_count;
    RAISE NOTICE '====================================';
END $$;

-- ============================================================================
-- OPÇÃO 1: LIMPEZA CONSERVADORA (Recomendado)
-- Remove apenas dados antigos (> 90 dias)
-- ============================================================================

-- Comentar/descomentar conforme necessário

/*
-- Deletar eventos antigos (> 90 dias)
DELETE FROM public.event_context
WHERE event_id IN (
    SELECT id FROM public.domain_events
    WHERE occurred_at < NOW() - INTERVAL '90 days'
);

DELETE FROM public.domain_events
WHERE occurred_at < NOW() - INTERVAL '90 days';

-- Deletar logs de execução antigos
DELETE FROM public.observer_execution_log
WHERE started_at < NOW() - INTERVAL '90 days';

DELETE FROM public.metric_execution_log
WHERE started_at < NOW() - INTERVAL '90 days';

-- Deletar métricas antigas não ativas
DELETE FROM public.derived_metrics
WHERE is_current = false
  AND calculated_at < NOW() - INTERVAL '90 days';

-- Deletar alertas resolvidos antigos
DELETE FROM public.operational_alerts
WHERE is_active = false
  AND resolved_at < NOW() - INTERVAL '90 days';

RAISE NOTICE 'Limpeza conservadora concluída (dados > 90 dias removidos)';
*/

-- ============================================================================
-- OPÇÃO 2: LIMPEZA COMPLETA (Apenas se tiver certeza!)
-- Remove TODOS os dados de telemetria
-- ============================================================================

-- ⚠️ CUIDADO: Descomente apenas se tiver CERTEZA que quer apagar tudo

/*
-- Desabilitar triggers temporariamente
ALTER TABLE public.event_context DISABLE TRIGGER ALL;
ALTER TABLE public.domain_events DISABLE TRIGGER ALL;

-- Deletar em ordem (respeitar foreign keys)
TRUNCATE TABLE public.event_context CASCADE;
TRUNCATE TABLE public.observer_execution_log CASCADE;
TRUNCATE TABLE public.observer_state CASCADE;
TRUNCATE TABLE public.metric_execution_log CASCADE;
TRUNCATE TABLE public.derived_metrics CASCADE;
TRUNCATE TABLE public.operational_alerts CASCADE;
TRUNCATE TABLE public.operational_baselines CASCADE;
TRUNCATE TABLE public.event_ingestion_errors CASCADE;
TRUNCATE TABLE public.domain_events CASCADE;

-- Reabilitar triggers
ALTER TABLE public.event_context ENABLE TRIGGER ALL;
ALTER TABLE public.domain_events ENABLE TRIGGER ALL;

RAISE NOTICE 'Limpeza COMPLETA concluída (todos os dados de telemetria removidos)';
*/

-- ============================================================================
-- OPÇÃO 3: ARQUIVAMENTO (Manter backup antes de deletar)
-- ============================================================================

/*
-- Criar tabela de arquivo
CREATE TABLE IF NOT EXISTS public.domain_events_archive (
    LIKE public.domain_events INCLUDING ALL
);

-- Mover eventos antigos para arquivo
INSERT INTO public.domain_events_archive
SELECT * FROM public.domain_events
WHERE occurred_at < NOW() - INTERVAL '90 days';

-- Deletar após arquivamento
DELETE FROM public.event_context
WHERE event_id IN (
    SELECT id FROM public.domain_events
    WHERE occurred_at < NOW() - INTERVAL '90 days'
);

DELETE FROM public.domain_events
WHERE occurred_at < NOW() - INTERVAL '90 days';

RAISE NOTICE 'Dados antigos arquivados em domain_events_archive';
*/

-- ============================================================================
-- OPÇÃO 4: DESABILITAR INGESTÃO (Sem deletar dados)
-- ============================================================================

-- Desabilitar geração de novos eventos (triggers já estão OFF)
-- Apenas garantir que config está correta

UPDATE public.event_ingestion_config
SET
    enable_triggers = false,
    enable_movement_events = false,
    enable_repair_events = false,
    enable_inventory_events = false,
    enable_vehicle_events = false,
    updated_at = NOW()
WHERE enable_triggers = true;

COMMENT ON TABLE public.domain_events IS
'DEPRECATED: Eventos agora são capturados via Cloudflare Workers.
Esta tabela será mantida por enquanto para referência histórica.';

COMMENT ON TABLE public.observer_execution_log IS
'DEPRECATED: Observers desativados após migração para Cloudflare.';

-- ============================================================================
-- VACUUM PARA RECUPERAR ESPAÇO (Após deletar dados)
-- ============================================================================

-- Rodar manualmente após executar deletes:
-- VACUUM FULL public.domain_events;
-- VACUUM FULL public.event_context;
-- VACUUM FULL public.observer_execution_log;
-- VACUUM FULL public.metric_execution_log;

-- ============================================================================
-- VERIFICAÇÃO PÓS-LIMPEZA
-- ============================================================================

DO $$
DECLARE
    domain_events_count INTEGER;
    total_size TEXT;
BEGIN
    SELECT COUNT(*) INTO domain_events_count FROM public.domain_events;

    SELECT pg_size_pretty(pg_total_relation_size('public.domain_events'))
    INTO total_size;

    RAISE NOTICE '=== PÓS-LIMPEZA ===';
    RAISE NOTICE 'domain_events restantes: %', domain_events_count;
    RAISE NOTICE 'Tamanho da tabela: %', total_size;
    RAISE NOTICE '===================';
END $$;
