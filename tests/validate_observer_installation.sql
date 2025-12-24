-- ============================================================================
-- VALIDAÇÃO PÓS-INSTALAÇÃO: Sistema de Observers
-- Execute este script para validar que as migrations foram aplicadas
-- ============================================================================

\echo '========================================='
\echo 'VALIDAÇÃO: Sistema de Eventos Derivados'
\echo '========================================='
\echo ''

-- ============================================================================
-- 1. VERIFICAR TABELAS CRIADAS
-- ============================================================================

\echo '1. Verificando tabelas criadas...'
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'derived_event_types' THEN '✓'
        WHEN table_name = 'observer_execution_log' THEN '✓'
        WHEN table_name = 'observer_state' THEN '✓'
        ELSE '?'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('derived_event_types', 'observer_execution_log', 'observer_state')
ORDER BY table_name;

\echo ''

-- ============================================================================
-- 2. VERIFICAR TIPOS DE EVENTOS DERIVADOS
-- ============================================================================

\echo '2. Verificando tipos de eventos derivados cadastrados...'
SELECT 
    event_type,
    category,
    observer_function,
    observer_version,
    enabled
FROM public.derived_event_types
ORDER BY event_type;

\echo ''

-- ============================================================================
-- 3. VERIFICAR FUNÇÕES CRIADAS
-- ============================================================================

\echo '3. Verificando funções de observers criadas...'
SELECT 
    proname as function_name,
    CASE 
        WHEN proname = 'fn_safe_emit_derived_event' THEN '✓ Helper'
        WHEN proname = 'fn_get_last_processed_event_id' THEN '✓ Helper'
        WHEN proname = 'fn_mark_observer_execution' THEN '✓ Helper'
        WHEN proname = 'fn_observe_repeated_late_returns' THEN '✓ Observer 1'
        WHEN proname = 'fn_observe_missing_actions' THEN '✓ Observer 2'
        WHEN proname = 'fn_observe_process_deviations' THEN '✓ Observer 3'
        WHEN proname = 'fn_observe_operational_friction' THEN '✓ Observer 4'
        WHEN proname = 'fn_run_all_observers' THEN '✓ Master'
        ELSE '?'
    END as tipo
FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND proname IN (
      'fn_safe_emit_derived_event',
      'fn_get_last_processed_event_id',
      'fn_mark_observer_execution',
      'fn_observe_repeated_late_returns',
      'fn_observe_missing_actions',
      'fn_observe_process_deviations',
      'fn_observe_operational_friction',
      'fn_run_all_observers'
  )
ORDER BY proname;

\echo ''

-- ============================================================================
-- 4. VERIFICAR NOVAS MÉTRICAS NO CATÁLOGO
-- ============================================================================

\echo '4. Verificando novas métricas no catálogo...'
SELECT 
    metric_key,
    display_name,
    calculation_frequency,
    alert_enabled
FROM public.metric_catalog
WHERE metric_key IN ('PROCESS_ADHERENCE_RATE', 'OPERATIONAL_FRICTION_INDEX')
ORDER BY metric_key;

\echo ''

-- ============================================================================
-- 5. VERIFICAR VIEWS DE CÁLCULO
-- ============================================================================

\echo '5. Verificando views de cálculo criadas...'
SELECT 
    table_name as view_name,
    CASE 
        WHEN table_name = 'v_calc_process_adherence_rate' THEN '✓'
        WHEN table_name = 'v_calc_operational_friction_index' THEN '✓'
        WHEN table_name = 'v_observer_health' THEN '✓'
        ELSE '?'
    END as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
      'v_calc_process_adherence_rate',
      'v_calc_operational_friction_index',
      'v_observer_health'
  )
ORDER BY table_name;

\echo ''

-- ============================================================================
-- 6. TESTE RÁPIDO: EMITIR EVENTO DERIVADO
-- ============================================================================

\echo '6. Teste de função helper (fn_safe_emit_derived_event)...'
DO $$
DECLARE
    v_test_profile_id UUID;
    v_test_collab_id UUID;
    v_event_id UUID;
BEGIN
    -- Pegar primeiro profile e colaborador disponível
    SELECT id INTO v_test_profile_id FROM profiles LIMIT 1;
    SELECT id INTO v_test_collab_id FROM colaboradores WHERE profile_id = v_test_profile_id LIMIT 1;
    
    IF v_test_profile_id IS NULL OR v_test_collab_id IS NULL THEN
        RAISE NOTICE '⚠ Nenhum profile/colaborador encontrado para teste';
        RETURN;
    END IF;
    
    -- Testar emissão de evento
    v_event_id := fn_safe_emit_derived_event(
        p_profile_id := v_test_profile_id,
        p_entity_type := 'collaborator',
        p_entity_id := v_test_collab_id,
        p_event_type := 'OPERATIONAL_FRICTION_SIGNAL',
        p_severity := 'LOW',
        p_payload := '{"test": "validation", "friction_type": "test"}'::jsonb
    );
    
    IF v_event_id IS NOT NULL THEN
        RAISE NOTICE '✓ Função fn_safe_emit_derived_event funcionando (event_id: %)', v_event_id;
        -- Limpar teste
        DELETE FROM domain_events WHERE id = v_event_id;
    ELSE
        RAISE NOTICE '⚠ Função retornou NULL (possível duplicata ou erro)';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- 7. SUMÁRIO FINAL
-- ============================================================================

\echo '========================================='
\echo 'SUMÁRIO DE VALIDAÇÃO'
\echo '========================================='

SELECT 
    'Tabelas' as componente,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
       AND table_name IN ('derived_event_types', 'observer_execution_log', 'observer_state')) as esperado_3,
    '3' as total
UNION ALL
SELECT 
    'Eventos Derivados',
    (SELECT COUNT(*) FROM derived_event_types WHERE enabled = true),
    '4'
UNION ALL
SELECT 
    'Funções Observer',
    (SELECT COUNT(*) FROM pg_proc 
     JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
     WHERE pg_namespace.nspname = 'public'
       AND proname LIKE 'fn_observe_%'),
    '4'
UNION ALL
SELECT 
    'Funções Helper',
    (SELECT COUNT(*) FROM pg_proc 
     JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
     WHERE pg_namespace.nspname = 'public'
       AND proname IN ('fn_safe_emit_derived_event', 'fn_get_last_processed_event_id', 'fn_mark_observer_execution')),
    '3'
UNION ALL
SELECT 
    'Novas Métricas',
    (SELECT COUNT(*) FROM metric_catalog WHERE metric_key IN ('PROCESS_ADHERENCE_RATE', 'OPERATIONAL_FRICTION_INDEX')),
    '2'
UNION ALL
SELECT 
    'Views de Cálculo',
    (SELECT COUNT(*) FROM information_schema.views 
     WHERE table_schema = 'public' 
       AND table_name IN ('v_calc_process_adherence_rate', 'v_calc_operational_friction_index', 'v_observer_health')),
    '3';

\echo ''
\echo '✓ Validação completa!'
\echo ''
\echo 'PRÓXIMOS PASSOS:'
\echo '1. Executar teste completo: psql $DATABASE_URL < tests/test_derived_events_observers.sql'
\echo '2. Rodar observer manualmente: SELECT fn_run_all_observers(''seu-profile-id'');'
\echo '3. Verificar saúde: SELECT * FROM v_observer_health;'
\echo '4. Deploy para produção e ativar cron'
\echo ''
