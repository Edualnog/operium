-- ============================================================================
-- Migration: 106_behavioral_observers.sql
-- Description: Implementação dos 4 observers comportamentais de eventos derivados
-- Author: AI Assistant
-- Date: 2024-12-24
-- 
-- OBSERVERS IMPLEMENTADOS:
-- 1. REPEATED_LATE_RETURN_PATTERN - Detecta padrões de atraso recorrente
-- 2. EXPECTED_ACTION_NOT_TAKEN - Detecta ações não executadas
-- 3. PROCESS_DEVIATION_DETECTED - Detecta desvios de processo
-- 4. OPERATIONAL_FRICTION_SIGNAL - Detecta sinais de fricção operacional
-- ============================================================================

-- ============================================================================
-- OBSERVER 1: REPEATED_LATE_RETURN_PATTERN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_observe_repeated_late_returns(
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_last_processed_id UUID;
    v_events_generated INTEGER := 0;
    v_events_skipped INTEGER := 0;
    v_events_analyzed INTEGER := 0;
    v_execution_id UUID;
    v_collaborator RECORD;
    v_late_returns RECORD;
    v_severity TEXT;
    v_event_id UUID;
    v_supporting_ids UUID[];
BEGIN
    -- Obter watermark
    v_last_processed_id := public.fn_get_last_processed_event_id(p_profile_id, 'fn_observe_repeated_late_returns');
    
    -- Buscar colaboradores com padrão de atrasos nos últimos 30 dias
    FOR v_late_returns IN
        WITH late_return_events AS (
            SELECT 
                de.id AS event_id,
                de.entity_id,
                (de.payload->>'colaborador_id')::uuid AS colaborador_id,
                de.occurred_at,
                de.payload->>'ferramenta_id' AS ferramenta_id,
                CASE 
                    WHEN de.payload->>'devolucao_at' IS NOT NULL 
                     AND de.payload->>'prazo_devolucao' IS NOT NULL
                    THEN EXTRACT(DAY FROM (
                        (de.payload->>'devolucao_at')::timestamptz - 
                        (de.payload->>'prazo_devolucao')::timestamptz
                    ))
                    ELSE 0
                END AS delay_days
            FROM public.domain_events de
            WHERE de.profile_id = p_profile_id
              AND de.entity_type = 'movement'
              AND de.event_type = 'TOOL_MOVEMENT_RETURN'
              AND de.occurred_at >= NOW() - INTERVAL '30 days'
              AND (de.id > v_last_processed_id OR v_last_processed_id IS NULL)
              AND (de.payload->>'devolucao_at')::timestamptz > (de.payload->>'prazo_devolucao')::timestamptz
        )
        SELECT 
            colaborador_id,
            COUNT(*) AS late_count,
            AVG(delay_days) AS avg_delay_days,
            ARRAY_AGG(event_id ORDER BY occurred_at) AS supporting_event_ids,
            MAX(occurred_at) AS latest_occurrence
        FROM late_return_events
        WHERE delay_days > 0
        GROUP BY colaborador_id
        HAVING COUNT(*) >= 3  -- Mínimo de 3 atrasos para configurar padrão
    LOOP
        v_events_analyzed := v_events_analyzed + 1;
        
        -- Determinar severidade baseado na contagem
        v_severity := CASE 
            WHEN v_late_returns.late_count >= 10 THEN 'CRITICAL'
            WHEN v_late_returns.late_count >= 6 THEN 'HIGH'
            ELSE 'MEDIUM'
        END;
        
        -- Emitir evento derivado
        v_event_id := public.fn_safe_emit_derived_event(
            p_profile_id := p_profile_id,
            p_entity_type := 'collaborator',
            p_entity_id := v_late_returns.colaborador_id,
            p_event_type := 'REPEATED_LATE_RETURN_PATTERN',
            p_severity := v_severity,
            p_payload := jsonb_build_object(
                'late_return_count', v_late_returns.late_count,
                'avg_delay_days', ROUND(v_late_returns.avg_delay_days, 2),
                'time_window_days', 30,
                'detection_timestamp', NOW()
            ),
            p_supporting_event_ids := v_late_returns.supporting_event_ids
        );
        
        IF v_event_id IS NOT NULL THEN
            v_events_generated := v_events_generated + 1;
        ELSE
            v_events_skipped := v_events_skipped + 1;
        END IF;
    END LOOP;
    
    -- Registrar execução
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_repeated_late_returns',
        p_observer_version := '1.0',
        p_last_event_id := (
            SELECT MAX(id) FROM public.domain_events 
            WHERE profile_id = p_profile_id 
              AND occurred_at >= NOW() - INTERVAL '30 days'
        ),
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'SUCCESS',
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_repeated_late_returns',
        'execution_id', v_execution_id,
        'events_generated', v_events_generated,
        'events_skipped', v_events_skipped,
        'events_analyzed', v_events_analyzed,
        'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Registrar falha
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_repeated_late_returns',
        p_observer_version := '1.0',
        p_last_event_id := v_last_processed_id,
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'FAILURE',
        p_error_message := SQLERRM,
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_repeated_late_returns',
        'status', 'FAILURE',
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_observe_repeated_late_returns IS 
'Observer: Detecta colaboradores com padrão recorrente de devoluções atrasadas.
Analisa últimos 30 dias, emite evento derivado se >= 3 atrasos.
Severidade: MEDIUM (3-5), HIGH (6-10), CRITICAL (10+).';

-- ============================================================================
-- OBSERVER 2: EXPECTED_ACTION_NOT_TAKEN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_observe_missing_actions(
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_last_processed_id UUID;
    v_events_generated INTEGER := 0;
    v_events_skipped INTEGER := 0;
    v_events_analyzed INTEGER := 0;
    v_execution_id UUID;
    v_missing_return RECORD;
    v_severity TEXT;
    v_event_id UUID;
    v_days_overdue INTEGER;
BEGIN
    v_last_processed_id := public.fn_get_last_processed_event_id(p_profile_id, 'fn_observe_missing_actions');
    
    -- Detectar devoluções não executadas após o prazo
    FOR v_missing_return IN
        SELECT 
            de.id AS checkout_event_id,
            de.entity_id AS movement_id,
            (de.payload->>'ferramenta_id')::uuid AS ferramenta_id,
            (de.payload->>'colaborador_id')::uuid AS colaborador_id,
            (de.payload->>'prazo_devolucao')::timestamptz AS expected_return_date,
            EXTRACT(DAY FROM (NOW() - (de.payload->>'prazo_devolucao')::timestamptz))::INTEGER AS days_overdue
        FROM public.domain_events de
        WHERE de.profile_id = p_profile_id
          AND de.entity_type = 'movement'
          AND de.event_type = 'TOOL_MOVEMENT_OUT'
          AND de.payload->>'prazo_devolucao' IS NOT NULL
          AND (de.payload->>'prazo_devolucao')::timestamptz < NOW() - INTERVAL '7 days'  -- Grace period de 7 dias
          -- Verificar se não há evento de devolução correspondente
          AND NOT EXISTS (
              SELECT 1 FROM public.domain_events return_event
              WHERE return_event.profile_id = p_profile_id
                AND return_event.entity_type = 'movement'
                AND return_event.event_type = 'TOOL_MOVEMENT_RETURN'
                AND return_event.payload->>'ferramenta_id' = de.payload->>'ferramenta_id'
                AND return_event.payload->>'colaborador_id' = de.payload->>'colaborador_id'
                AND return_event.occurred_at > de.occurred_at
          )
          AND (de.id > v_last_processed_id OR v_last_processed_id IS NULL)
        ORDER BY days_overdue DESC
        LIMIT 100  -- Processar em lotes
    LOOP
        v_events_analyzed := v_events_analyzed + 1;
        
        -- Determinar severidade por dias de atraso
        v_severity := CASE 
            WHEN v_missing_return.days_overdue >= 14 THEN 'CRITICAL'
            ELSE 'HIGH'
        END;
        
        -- Emitir evento derivado
        v_event_id := public.fn_safe_emit_derived_event(
            p_profile_id := p_profile_id,
            p_entity_type := 'movement',
            p_entity_id := v_missing_return.movement_id,
            p_event_type := 'EXPECTED_ACTION_NOT_TAKEN',
            p_severity := v_severity,
            p_payload := jsonb_build_object(
                'expected_action', 'TOOL_RETURN',
                'ferramenta_id', v_missing_return.ferramenta_id,
                'colaborador_id', v_missing_return.colaborador_id,
                'expected_return_date', v_missing_return.expected_return_date,
                'days_overdue', v_missing_return.days_overdue,
                'detection_timestamp', NOW()
            ),
            p_supporting_event_ids := ARRAY[v_missing_return.checkout_event_id]
        );
        
        IF v_event_id IS NOT NULL THEN
            v_events_generated := v_events_generated + 1;
        ELSE
            v_events_skipped := v_events_skipped + 1;
        END IF;
    END LOOP;
    
    -- Registrar execução
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_missing_actions',
        p_observer_version := '1.0',
        p_last_event_id := (
            SELECT MAX(id) FROM public.domain_events 
            WHERE profile_id = p_profile_id 
              AND entity_type = 'movement'
        ),
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'SUCCESS',
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_missing_actions',
        'execution_id', v_execution_id,
        'events_generated', v_events_generated,
        'events_skipped', v_events_skipped,
        'events_analyzed', v_events_analyzed,
        'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))
    );
    
EXCEPTION WHEN OTHERS THEN
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_missing_actions',
        p_observer_version := '1.0',
        p_last_event_id := v_last_processed_id,
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'FAILURE',
        p_error_message := SQLERRM,
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_missing_actions',
        'status', 'FAILURE',
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_observe_missing_actions IS 
'Observer: Detecta ações esperadas que não foram executadas (devoluções em atraso).
Grace period de 7 dias. Severidade: HIGH (7-14 dias), CRITICAL (14+ dias).';

-- ============================================================================
-- OBSERVER 3: PROCESS_DEVIATION_DETECTED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_observe_process_deviations(
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_last_processed_id UUID;
    v_events_generated INTEGER := 0;
    v_events_skipped INTEGER := 0;
    v_events_analyzed INTEGER := 0;
    v_execution_id UUID;
    v_deviation RECORD;
    v_event_id UUID;
BEGIN
    v_last_processed_id := public.fn_get_last_processed_event_id(p_profile_id, 'fn_observe_process_deviations');
    
    -- Detectar consertos sem evento de dano prévio
    FOR v_deviation IN
        SELECT 
            de.id AS repair_event_id,
            de.entity_id,
            de.payload->>'ferramenta_id' AS ferramenta_id,
            de.occurred_at,
            'REPAIR_WITHOUT_DAMAGE' AS deviation_type
        FROM public.domain_events de
        WHERE de.profile_id = p_profile_id
          AND de.entity_type = 'repair'
          AND de.event_type = 'TOOL_REPAIR_CREATED'
          AND de.occurred_at >= NOW() - INTERVAL '7 days'
          AND (de.id > v_last_processed_id OR v_last_processed_id IS NULL)
          -- Verificar se não existe evento de dano nos 30 dias anteriores
          AND NOT EXISTS (
              SELECT 1 FROM public.domain_events damage_event
              WHERE damage_event.profile_id = p_profile_id
                AND damage_event.entity_type = 'tool'
                AND damage_event.event_type = 'TOOL_DAMAGED'
                AND damage_event.entity_id::text = de.payload->>'ferramenta_id'
                AND damage_event.occurred_at <= de.occurred_at
                AND damage_event.occurred_at >= de.occurred_at - INTERVAL '30 days'
          )
        LIMIT 50
    LOOP
        v_events_analyzed := v_events_analyzed + 1;
        
        -- Emitir evento derivado
        v_event_id := public.fn_safe_emit_derived_event(
            p_profile_id := p_profile_id,
            p_entity_type := 'repair',
            p_entity_id := v_deviation.entity_id,
            p_event_type := 'PROCESS_DEVIATION_DETECTED',
            p_severity := 'MEDIUM',
            p_payload := jsonb_build_object(
                'deviation_type', v_deviation.deviation_type,
                'ferramenta_id', v_deviation.ferramenta_id,
                'expected_sequence', 'TOOL_DAMAGED -> TOOL_REPAIR_CREATED',
                'actual_sequence', 'TOOL_REPAIR_CREATED (without prior damage)',
                'detection_timestamp', NOW()
            ),
            p_supporting_event_ids := ARRAY[v_deviation.repair_event_id]
        );
        
        IF v_event_id IS NOT NULL THEN
            v_events_generated := v_events_generated + 1;
        ELSE
            v_events_skipped := v_events_skipped + 1;
        END IF;
    END LOOP;
    
    -- Registrar execução
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_process_deviations',
        p_observer_version := '1.0',
        p_last_event_id := (
            SELECT MAX(id) FROM public.domain_events 
            WHERE profile_id = p_profile_id 
              AND entity_type IN ('repair', 'tool')
        ),
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'SUCCESS',
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_process_deviations',
        'execution_id', v_execution_id,
        'events_generated', v_events_generated,
        'events_skipped', v_events_skipped,
        'events_analyzed', v_events_analyzed,
        'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))
    );
    
EXCEPTION WHEN OTHERS THEN
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_process_deviations',
        p_observer_version := '1.0',
        p_last_event_id := v_last_processed_id,
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'FAILURE',
        p_error_message := SQLERRM,
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_process_deviations',
        'status', 'FAILURE',
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_observe_process_deviations IS 
'Observer: Detecta desvios de processo (ex: conserto sem dano prévio).
Severidade: MEDIUM (desvio suspeito), HIGH (desvio confirmado).';

-- ============================================================================
-- OBSERVER 4: OPERATIONAL_FRICTION_SIGNAL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_observe_operational_friction(
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_last_processed_id UUID;
    v_events_generated INTEGER := 0;
    v_events_skipped INTEGER := 0;
    v_events_analyzed INTEGER := 0;
    v_execution_id UUID;
    v_friction RECORD;
    v_event_id UUID;
    v_severity TEXT;
BEGIN
    v_last_processed_id := public.fn_get_last_processed_event_id(p_profile_id, 'fn_observe_operational_friction');
    
    -- Detectar trocas frequentes (mesmo colaborador, mesma ferramenta, múltiplas retiradas/devoluções)
    FOR v_friction IN
        WITH tool_swaps AS (
            SELECT 
                (de.payload->>'colaborador_id')::uuid AS colaborador_id,
                (de.payload->>'ferramenta_id')::uuid AS ferramenta_id,
                COUNT(*) AS swap_count,
                ARRAY_AGG(de.id ORDER BY de.occurred_at) AS supporting_event_ids,
                MAX(de.occurred_at) AS latest_swap
            FROM public.domain_events de
            WHERE de.profile_id = p_profile_id
              AND de.entity_type = 'movement'
              AND de.event_type IN ('TOOL_MOVEMENT_OUT', 'TOOL_MOVEMENT_RETURN')
              AND de.occurred_at >= NOW() - INTERVAL '7 days'
              AND (de.id > v_last_processed_id OR v_last_processed_id IS NULL)
            GROUP BY 
                (de.payload->>'colaborador_id')::uuid,
                (de.payload->>'ferramenta_id')::uuid
            HAVING COUNT(*) >= 5  -- 5+ movimentações da mesma ferramenta em 7 dias
        )
        SELECT 
            colaborador_id,
            ferramenta_id,
            swap_count,
            supporting_event_ids,
            'HIGH_FREQUENCY_TOOL_SWAP' AS friction_type
        FROM tool_swaps
        ORDER BY swap_count DESC
        LIMIT 50
    LOOP
        v_events_analyzed := v_events_analyzed + 1;
        
        -- Determinar severidade
        v_severity := CASE 
            WHEN v_friction.swap_count >= 10 THEN 'MEDIUM'
            ELSE 'LOW'
        END;
        
        -- Emitir evento derivado
        v_event_id := public.fn_safe_emit_derived_event(
            p_profile_id := p_profile_id,
            p_entity_type := 'collaborator',
            p_entity_id := v_friction.colaborador_id,
            p_event_type := 'OPERATIONAL_FRICTION_SIGNAL',
            p_severity := v_severity,
            p_payload := jsonb_build_object(
                'friction_type', v_friction.friction_type,
                'ferramenta_id', v_friction.ferramenta_id,
                'swap_frequency', v_friction.swap_count,
                'time_window_days', 7,
                'pattern_score', ROUND(v_friction.swap_count / 7.0, 2),
                'detection_timestamp', NOW()
            ),
            p_supporting_event_ids := v_friction.supporting_event_ids[1:10]  -- Limitar a 10 IDs
        );
        
        IF v_event_id IS NOT NULL THEN
            v_events_generated := v_events_generated + 1;
        ELSE
            v_events_skipped := v_events_skipped + 1;
        END IF;
    END LOOP;
    
    -- Registrar execução
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_operational_friction',
        p_observer_version := '1.0',
        p_last_event_id := (
            SELECT MAX(id) FROM public.domain_events 
            WHERE profile_id = p_profile_id 
              AND entity_type = 'movement'
        ),
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'SUCCESS',
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_operational_friction',
        'execution_id', v_execution_id,
        'events_generated', v_events_generated,
        'events_skipped', v_events_skipped,
        'events_analyzed', v_events_analyzed,
        'duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))
    );
    
EXCEPTION WHEN OTHERS THEN
    v_execution_id := public.fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_operational_friction',
        p_observer_version := '1.0',
        p_last_event_id := v_last_processed_id,
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'FAILURE',
        p_error_message := SQLERRM,
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object(
        'observer', 'fn_observe_operational_friction',
        'status', 'FAILURE',
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_observe_operational_friction IS 
'Observer: Detecta sinais de fricção operacional (trocas frequentes de ferramenta).
Severidade: LOW (5-9 trocas), MEDIUM (10+ trocas) em 7 dias.';

-- ============================================================================
-- FUNÇÃO MASTER: EXECUTAR TODOS OS OBSERVERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_run_all_observers(
    p_profile_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_results JSONB := '[]'::jsonb;
    v_result JSONB;
    v_total_events INTEGER := 0;
    v_failed_observers TEXT[] := '{}';
BEGIN
    -- Observer 1: Repeated Late Returns
    BEGIN
        v_result := public.fn_observe_repeated_late_returns(p_profile_id);
        v_results := v_results || jsonb_build_array(v_result);
        v_total_events := v_total_events + COALESCE((v_result->>'events_generated')::integer, 0);
        
        IF v_result->>'status' = 'FAILURE' THEN
            v_failed_observers := array_append(v_failed_observers, 'fn_observe_repeated_late_returns');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_array(jsonb_build_object(
            'observer', 'fn_observe_repeated_late_returns',
            'status', 'FAILURE',
            'error', SQLERRM
        ));
        v_failed_observers := array_append(v_failed_observers, 'fn_observe_repeated_late_returns');
    END;
    
    -- Observer 2: Missing Expected Actions
    BEGIN
        v_result := public.fn_observe_missing_actions(p_profile_id);
        v_results := v_results || jsonb_build_array(v_result);
        v_total_events := v_total_events + COALESCE((v_result->>'events_generated')::integer, 0);
        
        IF v_result->>'status' = 'FAILURE' THEN
            v_failed_observers := array_append(v_failed_observers, 'fn_observe_missing_actions');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_array(jsonb_build_object(
            'observer', 'fn_observe_missing_actions',
            'status', 'FAILURE',
            'error', SQLERRM
        ));
        v_failed_observers := array_append(v_failed_observers, 'fn_observe_missing_actions');
    END;
    
    -- Observer 3: Process Deviations
    BEGIN
        v_result := public.fn_observe_process_deviations(p_profile_id);
        v_results := v_results || jsonb_build_array(v_result);
        v_total_events := v_total_events + COALESCE((v_result->>'events_generated')::integer, 0);
        
        IF v_result->>'status' = 'FAILURE' THEN
            v_failed_observers := array_append(v_failed_observers, 'fn_observe_process_deviations');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_array(jsonb_build_object(
            'observer', 'fn_observe_process_deviations',
            'status', 'FAILURE',
            'error', SQLERRM
        ));
        v_failed_observers := array_append(v_failed_observers, 'fn_observe_process_deviations');
    END;
    
    -- Observer 4: Operational Friction
    BEGIN
        v_result := public.fn_observe_operational_friction(p_profile_id);
        v_results := v_results || jsonb_build_array(v_result);
        v_total_events := v_total_events + COALESCE((v_result->>'events_generated')::integer, 0);
        
        IF v_result->>'status' = 'FAILURE' THEN
            v_failed_observers := array_append(v_failed_observers, 'fn_observe_operational_friction');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_results := v_results || jsonb_build_array(jsonb_build_object(
            'observer', 'fn_observe_operational_friction',
            'status', 'FAILURE',
            'error', SQLERRM
        ));
        v_failed_observers := array_append(v_failed_observers, 'fn_observe_operational_friction');
    END;
    
    -- Retornar sumário executivo
    RETURN jsonb_build_object(
        'profile_id', p_profile_id,
        'executed_at', NOW(),
        'total_duration_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time)),
        'total_events_generated', v_total_events,
        'observers_executed', 4,
        'observers_failed', array_length(v_failed_observers, 1),
        'failed_observers', v_failed_observers,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_run_all_observers IS 
'Função master: Executa todos os 4 observers comportamentais em sequência.
Isolamento de erros: falha de um observer não interrompe os demais.
Retorna sumário executivo com contagem de eventos e status.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
