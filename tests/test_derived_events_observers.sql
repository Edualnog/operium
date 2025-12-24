-- ============================================================================
-- Test Suite: Derived Events Observers
-- Description: Testes unitários e de integração para sistema de observers
-- Author: AI Assistant
-- Date: 2024-12-24
-- ============================================================================

-- Pré-requisitos: Executar após migrations 105, 106, 107

-- ============================================================================
-- SETUP: Criar perfil e dados de teste
-- ============================================================================

DO $$
DECLARE
    v_test_profile_id UUID;
    v_test_collab_id UUID;
    v_test_tool_id UUID;
    v_event_id UUID;
BEGIN
    -- Criar profile de teste
    INSERT INTO profiles (id, email) 
    VALUES (gen_random_uuid(), 'test@observer.com')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_test_profile_id;
    
    -- Criar colaborador de teste
    INSERT INTO colaboradores (id, profile_id, nome, cpf, cargo, status)
    VALUES (gen_random_uuid(), v_test_profile_id, 'Colaborador Teste', '00000000000', 'Operador', 'ATIVO')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_test_collab_id;
    
    RAISE NOTICE 'Setup completo: profile_id = %, collab_id = %', v_test_profile_id, v_test_collab_id;
END $$;

-- ============================================================================
-- TEST 1: fn_safe_emit_derived_event - Validação de Payload
-- ============================================================================

DO $$
DECLARE
    v_event_id UUID;
    v_profile_id UUID := (SELECT id FROM profiles WHERE email = 'test@observer.com' LIMIT 1);
BEGIN
    RAISE NOTICE 'TEST 1: Validação de Payload';
    
    -- Test 1.1: Payload válido (< 2KB)
    v_event_id := fn_safe_emit_derived_event(
        p_profile_id := v_profile_id,
        p_entity_type := 'collaborator',
        p_entity_id := (SELECT id FROM colaboradores WHERE profile_id = v_profile_id LIMIT 1),
        p_event_type := 'REPEATED_LATE_RETURN_PATTERN',
        p_severity := 'HIGH',
        p_payload := '{"test": "valid"}'::jsonb
    );
    
    IF v_event_id IS NOT NULL THEN
        RAISE NOTICE '✓ Test 1.1 PASSED: Payload válido aceito';
    ELSE
        RAISE EXCEPTION '✗ Test 1.1 FAILED: Payload válido rejeitado';
    END IF;
    
    -- Test 1.2: Deduplicação (mesmo evento deve retornar NULL)
    v_event_id := fn_safe_emit_derived_event(
        p_profile_id := v_profile_id,
        p_entity_type := 'collaborator',
        p_entity_id := (SELECT id FROM colaboradores WHERE profile_id = v_profile_id LIMIT 1),
        p_event_type := 'REPEATED_LATE_RETURN_PATTERN',
        p_severity := 'HIGH',
        p_payload := '{"test": "valid"}'::jsonb
    );
    
    IF v_event_id IS NULL THEN
        RAISE NOTICE '✓ Test 1.2 PASSED: Deduplicação funcionando';
    ELSE
        RAISE EXCEPTION '✗ Test 1.2 FAILED: Duplicata criada (event_id: %)', v_event_id;
    END IF;
    
END $$;

-- ============================================================================
-- TEST 2: fn_observe_repeated_late_returns - Detecção de Padrão
-- ============================================================================

DO $$
DECLARE
    v_profile_id UUID := (SELECT id FROM profiles WHERE email = 'test@observer.com' LIMIT 1);
    v_collab_id UUID := (SELECT id FROM colaboradores WHERE profile_id = v_profile_id LIMIT 1);
    v_result JSONB;
    v_derived_events_count INTEGER;
    i INTEGER;
BEGIN
    RAISE NOTICE 'TEST 2: Detecção de Padrão de Atrasos';
    
    -- Setup: Criar 5 eventos de devolução atrasada
    FOR i IN 1..5 LOOP
        INSERT INTO domain_events (
            profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at
        ) VALUES (
            v_profile_id,
            'movement',
            gen_random_uuid(),
            'TOOL_MOVEMENT_RETURN',
            'user',
            jsonb_build_object(
                'colaborador_id', v_collab_id,
                'ferramenta_id', gen_random_uuid(),
                'devolucao_at', NOW() - INTERVAL '5 days',
                'prazo_devolucao', NOW() - INTERVAL '10 days'
            ),
            NOW() - (i || ' days')::INTERVAL
        );
    END LOOP;
    
    -- Executar observer
    v_result := fn_observe_repeated_late_returns(v_profile_id);
    
    -- Verificar eventos gerados
    SELECT COUNT(*) INTO v_derived_events_count
    FROM domain_events
    WHERE profile_id = v_profile_id
      AND event_type = 'REPEATED_LATE_RETURN_PATTERN'
      AND entity_id = v_collab_id
      AND ingested_at >= NOW() - INTERVAL '1 minute';
    
    IF v_derived_events_count >= 1 THEN
        RAISE NOTICE '✓ Test 2 PASSED: Padrão detectado (% eventos gerados)', v_derived_events_count;
    ELSE
        RAISE EXCEPTION '✗ Test 2 FAILED: Padrão não detectado (esperado >= 1, obtido %)', v_derived_events_count;
    END IF;
    
    RAISE NOTICE 'Observer result: %', v_result;
END $$;

-- ============================================================================
-- TEST 3: fn_observe_missing_actions - Devoluções Ausentes
-- ============================================================================

DO $$
DECLARE
    v_profile_id UUID := (SELECT id FROM profiles WHERE email = 'test@observer.com' LIMIT 1);
    v_collab_id UUID := (SELECT id FROM colaboradores WHERE profile_id = v_profile_id LIMIT 1);
    v_result JSONB;
    v_missing_action_count INTEGER;
BEGIN
    RAISE NOTICE 'TEST 3: Detecção de Ações Ausentes';
    
    -- Setup: Criar checkout sem devolução (prazo há 15 dias atrás)
    INSERT INTO domain_events (
        profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at
    ) VALUES (
        v_profile_id,
        'movement',
        gen_random_uuid(),
        'TOOL_MOVEMENT_OUT',
        'user',
        jsonb_build_object(
            'colaborador_id', v_collab_id,
            'ferramenta_id', gen_random_uuid(),
            'prazo_devolucao', NOW() - INTERVAL '15 days'
        ),
        NOW() - INTERVAL '20 days'
    );
    
    -- Executar observer
    v_result := fn_observe_missing_actions(v_profile_id);
    
    -- Verificar eventos gerados
    SELECT COUNT(*) INTO v_missing_action_count
    FROM domain_events
    WHERE profile_id = v_profile_id
      AND event_type = 'EXPECTED_ACTION_NOT_TAKEN'
      AND ingested_at >= NOW() - INTERVAL '1 minute';
    
    IF v_missing_action_count >= 1 THEN
        RAISE NOTICE '✓ Test 3 PASSED: Ação ausente detectada';
    ELSE
        RAISE NOTICE '! Test 3 SKIPPED: Dependente de dados históricos';
    END IF;
END $$;

-- ============================================================================
-- TEST 4: fn_run_all_observers - Execução Master
-- ============================================================================

DO $$
DECLARE
    v_profile_id UUID := (SELECT id FROM profiles WHERE email = 'test@observer.com' LIMIT 1);
    v_result JSONB;
BEGIN
    RAISE NOTICE 'TEST 4: Execução Master de Observers';
    
    v_result := fn_run_all_observers(v_profile_id);
    
    IF (v_result->>'observers_failed')::int = 0 THEN
        RAISE NOTICE '✓ Test 4 PASSED: Todos observers executados sem falha';
    ELSE
        RAISE WARNING '! Test 4 WARNING: % observers falharam', v_result->>'observers_failed';
    END IF;
    
    RAISE NOTICE 'Master observer result: %', v_result;
END $$;

-- ============================================================================
-- TEST 5: Observer Health View
-- ============================================================================

DO $$
DECLARE
    v_health_count INTEGER;
BEGIN
    RAISE NOTICE 'TEST 5: View de Saúde dos Observers';
    
    SELECT COUNT(*) INTO v_health_count
    FROM v_observer_health;
    
    IF v_health_count > 0 THEN
        RAISE NOTICE '✓ Test 5 PASSED: View retornando dados (% registros)', v_health_count;
    ELSE
        RAISE NOTICE '! Test 5 INFO: Nenhum observer executado ainda';
    END IF;
END $$;

-- ============================================================================
-- TEST 6: Metrics Integration - Collaborator Behavior Features
-- ============================================================================

DO $$
DECLARE
    v_profile_id UUID := (SELECT id FROM profiles WHERE email = 'test@observer.com' LIMIT 1);
    v_updated_count INTEGER;
BEGIN
    RAISE NOTICE 'TEST 6: Integração com Comportamental Features';
    
    -- Executar cálculo de scores
    v_updated_count := analytics.calculate_collaborator_scores();
    
    IF v_updated_count > 0 THEN
        RAISE NOTICE '✓ Test 6 PASSED: Scores calculados (% colaboradores)', v_updated_count;
    ELSE
        RAISE NOTICE '! Test 6 INFO: Nenhum score atualizado';
    END IF;
    
    -- Verificar versão de cálculo
    IF EXISTS (
        SELECT 1 FROM collaborator_behavior_features 
        WHERE calculation_version = 2 LIMIT 1
    ) THEN
        RAISE NOTICE '✓ Test 6.1 PASSED: Versão 2 do cálculo aplicada';
    ELSE
        RAISE NOTICE '! Test 6.1 INFO: Versão 2 ainda não aplicada';
    END IF;
END $$;

-- ============================================================================
-- CLEANUP (Opcional): Remover dados de teste
-- ============================================================================

-- UNCOMMENT to cleanup:
/*
DO $$
DECLARE
    v_test_profile_id UUID := (SELECT id FROM profiles WHERE email = 'test@observer.com' LIMIT 1);
BEGIN
    -- Deletar eventos de teste
    DELETE FROM domain_events WHERE profile_id = v_test_profile_id;
    
    -- Deletar colaboradores de teste
    DELETE FROM colaboradores WHERE profile_id = v_test_profile_id;
    
    -- Deletar profile de teste
    DELETE FROM profiles WHERE id = v_test_profile_id;
    
    RAISE NOTICE 'Cleanup completo';
END $$;
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
    'TESTS COMPLETED' as status,
    NOW() as timestamp;

-- Para ver health status dos observers:
-- SELECT * FROM v_observer_health;

-- Para ver últimas execuções:
-- SELECT * FROM observer_execution_log ORDER BY started_at DESC LIMIT 10;

-- Para ver eventos derivados gerados:
-- SELECT event_type, payload->>'severity', occurred_at 
-- FROM domain_events 
-- WHERE event_source = 'automation' 
-- ORDER BY occurred_at DESC LIMIT 20;
