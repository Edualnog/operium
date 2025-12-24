-- ============================================================================
-- VALIDAÇÃO RÁPIDA - Para Supabase SQL Editor
-- ============================================================================

-- 1. Verificar tabelas criadas
SELECT 
    'Tabelas Criadas' as validacao,
    COUNT(*) as encontrado,
    3 as esperado,
    CASE WHEN COUNT(*) = 3 THEN '✓ OK' ELSE '✗ ERRO' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('derived_event_types', 'observer_execution_log', 'observer_state');

-- 2. Verificar tipos de eventos derivados
SELECT 
    'Eventos Derivados' as validacao,
    COUNT(*) as encontrado,
    4 as esperado,
    CASE WHEN COUNT(*) = 4 THEN '✓ OK' ELSE '✗ ERRO' END as status
FROM public.derived_event_types
WHERE enabled = true;

-- 3. Listar eventos derivados cadastrados
SELECT 
    event_type,
    category,
    observer_function,
    observer_version,
    enabled
FROM public.derived_event_types
ORDER BY event_type;

-- 4. Verificar funções de observer criadas
SELECT 
    'Funções Observer' as validacao,
    COUNT(*) as encontrado,
    4 as esperado,
    CASE WHEN COUNT(*) = 4 THEN '✓ OK' ELSE '✗ ERRO' END as status
FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND proname LIKE 'fn_observe_%';

-- 5. Listar todas as funções relacionadas
SELECT 
    proname as function_name,
    CASE 
        WHEN proname LIKE '%helper%' OR proname IN ('fn_safe_emit_derived_event', 'fn_get_last_processed_event_id', 'fn_mark_observer_execution') 
            THEN 'Helper'
        WHEN proname LIKE 'fn_observe_%' THEN 'Observer'
        WHEN proname = 'fn_run_all_observers' THEN 'Master'
        ELSE 'Other'
    END as tipo
FROM pg_proc
JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
WHERE pg_namespace.nspname = 'public'
  AND (
      proname LIKE 'fn_observe_%' 
      OR proname IN ('fn_safe_emit_derived_event', 'fn_get_last_processed_event_id', 'fn_mark_observer_execution', 'fn_run_all_observers')
  )
ORDER BY tipo, proname;

-- 6. Verificar novas métricas
SELECT 
    'Novas Métricas' as validacao,
    COUNT(*) as encontrado,
    2 as esperado,
    CASE WHEN COUNT(*) = 2 THEN '✓ OK' ELSE '✗ ERRO' END as status
FROM public.metric_catalog
WHERE metric_key IN ('PROCESS_ADHERENCE_RATE', 'OPERATIONAL_FRICTION_INDEX');

-- 7. Verificar views criadas
SELECT 
    'Views Criadas' as validacao,
    COUNT(*) as encontrado,
    3 as esperado,
    CASE WHEN COUNT(*) = 3 THEN '✓ OK' ELSE '✗ ERRO' END as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('v_calc_process_adherence_rate', 'v_calc_operational_friction_index', 'v_observer_health');

-- 8. Buscar profile_id para teste
SELECT 
    'Profile para Teste' as info,
    id as profile_id,
    company_name,
    'Copie o ID acima para testar observers' as instrucao
FROM profiles
LIMIT 1;

-- ============================================================================
-- PRÓXIMOS PASSOS
-- ============================================================================
-- 
-- 1. Copie um profile_id da query acima
-- 2. Execute: SELECT fn_run_all_observers('COLE_PROFILE_ID_AQUI');
-- 3. Verifique: SELECT * FROM v_observer_health;
-- 4. Veja eventos: SELECT * FROM domain_events WHERE event_source = 'automation' ORDER BY occurred_at DESC LIMIT 10;
-- ============================================================================
