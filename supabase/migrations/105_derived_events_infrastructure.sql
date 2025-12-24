-- ============================================================================
-- Migration: 105_derived_events_infrastructure.sql
-- Description: Infraestrutura para sistema de eventos derivados (segunda ordem)
-- Author: AI Assistant
-- Date: 2024-12-24
-- 
-- PRINCÍPIOS:
-- 1. Eventos derivados são gerados automaticamente por observers
-- 2. Observers são idempotentes (não geram duplicatas)
-- 3. Payloads são pequenos (< 2KB) e sem PII
-- 4. Tudo é versionado e auditável
-- ============================================================================

-- ============================================================================
-- PARTE 1: CATÁLOGO DE TIPOS DE EVENTOS DERIVADOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.derived_event_types (
    event_type TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('behavioral', 'pattern', 'deviation', 'friction')),
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    severity_logic TEXT NOT NULL,
    observer_function TEXT NOT NULL,
    observer_version TEXT NOT NULL DEFAULT '1.0',
    min_confidence_threshold NUMERIC(3,2) DEFAULT 0.70,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.derived_event_types IS 
'Catálogo de tipos de eventos derivados (segunda ordem).
Eventos derivados são gerados automaticamente por observers que analisam eventos históricos.';

COMMENT ON COLUMN public.derived_event_types.category IS 'behavioral=padrões comportamentais, pattern=padrões recorrentes, deviation=desvios de processo, friction=sinais de fricção';
COMMENT ON COLUMN public.derived_event_types.severity_logic IS 'Descrição da lógica de cálculo de severidade (LOW/MEDIUM/HIGH/CRITICAL)';
COMMENT ON COLUMN public.derived_event_types.observer_function IS 'Nome da função SQL que detecta este padrão';
COMMENT ON COLUMN public.derived_event_types.observer_version IS 'Versão do algoritmo de detecção';

-- Inserir tipos iniciais
INSERT INTO public.derived_event_types (
    event_type, category, display_name, description, severity_logic, observer_function, observer_version
) VALUES
(
    'REPEATED_LATE_RETURN_PATTERN',
    'behavioral',
    'Padrão de Atrasos Recorrentes',
    'Colaborador apresenta padrão recorrente de devoluções atrasadas de ferramentas',
    'MEDIUM: 3-5 atrasos em 30 dias, HIGH: 6-10 atrasos, CRITICAL: 10+ atrasos',
    'fn_observe_repeated_late_returns',
    '1.0'
),
(
    'EXPECTED_ACTION_NOT_TAKEN',
    'deviation',
    'Ação Esperada Não Executada',
    'Ação esperada (devolução, manutenção) não foi executada dentro do prazo',
    'HIGH: 7-14 dias após prazo, CRITICAL: 14+ dias após prazo',
    'fn_observe_missing_actions',
    '1.0'
),
(
    'PROCESS_DEVIATION_DETECTED',
    'deviation',
    'Desvio de Processo Detectado',
    'Operação executada fora do processo padrão esperado',
    'MEDIUM: desvio suspeito, HIGH: desvio confirmado',
    'fn_observe_process_deviations',
    '1.0'
),
(
    'OPERATIONAL_FRICTION_SIGNAL',
    'friction',
    'Sinal de Fricção Operacional',
    'Padrão de alta fricção operacional detectado (trocas frequentes, horários incomuns)',
    'LOW: possível fricção, MEDIUM: padrão confirmado',
    'fn_observe_operational_friction',
    '1.0'
)
ON CONFLICT (event_type) DO NOTHING;

-- ============================================================================
-- PARTE 2: LOG DE EXECUÇÃO DE OBSERVERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.observer_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    observer_name TEXT NOT NULL,
    observer_version TEXT NOT NULL,
    
    -- Resultado da execução
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE')),
    events_generated INTEGER NOT NULL DEFAULT 0,
    events_skipped INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    
    -- Métricas de performance
    execution_duration_ms INTEGER,
    events_analyzed INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Metadata
    execution_metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_observer_execution_log_profile ON public.observer_execution_log(profile_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_observer_execution_log_observer ON public.observer_execution_log(observer_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_observer_execution_log_status ON public.observer_execution_log(status) WHERE status != 'SUCCESS';

COMMENT ON TABLE public.observer_execution_log IS 
'Log de execuções de observers para auditoria e debugging.
Cada execução de observer é registrada aqui com métricas de performance e resultados.';

-- RLS
ALTER TABLE public.observer_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own observer logs" ON public.observer_execution_log
    FOR SELECT USING (profile_id = auth.uid());

-- ============================================================================
-- PARTE 3: ESTADO DOS OBSERVERS (WATERMARKS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.observer_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    observer_name TEXT NOT NULL,
    
    -- Watermark para processamento incremental
    last_processed_event_id UUID,
    last_processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT observer_state_unique UNIQUE(profile_id, observer_name)
);

CREATE INDEX IF NOT EXISTS idx_observer_state_profile ON public.observer_state(profile_id);

COMMENT ON TABLE public.observer_state IS 
'Estado persistente dos observers para processamento incremental.
Armazena watermark (último evento processado) para evitar reprocessamento.';

COMMENT ON COLUMN public.observer_state.last_processed_event_id IS 'ID do último evento processado por este observer (watermark)';

-- RLS
ALTER TABLE public.observer_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own observer state" ON public.observer_state
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "System can manage observer state" ON public.observer_state
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- PARTE 4: FUNÇÃO HELPER - EMITIR EVENTO DERIVADO COM SEGURANÇA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_safe_emit_derived_event(
    p_profile_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_event_type TEXT,
    p_severity TEXT,
    p_payload JSONB,
    p_supporting_event_ids UUID[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_full_payload JSONB;
    v_payload_size INTEGER;
    v_dedup_hash TEXT;
BEGIN
    -- Validar severidade
    IF p_severity NOT IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') THEN
        RAISE EXCEPTION 'Invalid severity: %. Must be LOW, MEDIUM, HIGH, or CRITICAL', p_severity;
    END IF;
    
    -- Validar tipo de evento derivado
    IF NOT EXISTS (SELECT 1 FROM public.derived_event_types WHERE event_type = p_event_type AND enabled = TRUE) THEN
        RAISE EXCEPTION 'Invalid or disabled derived event type: %', p_event_type;
    END IF;
    
    -- Enriquecer payload
    v_full_payload := COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
        'severity', p_severity,
        'supporting_event_ids', COALESCE(p_supporting_event_ids, ARRAY[]::UUID[]),
        'observer_version', (SELECT observer_version FROM public.derived_event_types WHERE event_type = p_event_type),
        'generated_at', NOW()
    );
    
    -- Validar tamanho do payload (< 2KB)
    v_payload_size := LENGTH(v_full_payload::text);
    IF v_payload_size > 2048 THEN
        RAISE EXCEPTION 'Payload too large: % bytes (max 2048)', v_payload_size;
    END IF;
    
    -- Calcular hash de deduplicação
    v_dedup_hash := md5(
        p_profile_id::text || 
        p_entity_type || 
        COALESCE(p_entity_id::text, '') || 
        p_event_type ||
        (v_full_payload - 'generated_at' - 'supporting_event_ids')::text
    );
    
    -- Verificar duplicatas recentes (últimas 24 horas)
    IF EXISTS (
        SELECT 1 FROM public.domain_events
        WHERE profile_id = p_profile_id
          AND entity_type = p_entity_type
          AND event_type = p_event_type
          AND (payload->>'dedup_hash') = v_dedup_hash
          AND occurred_at >= NOW() - INTERVAL '24 hours'
    ) THEN
        -- Evento duplicado, retornar NULL sem criar
        RETURN NULL;
    END IF;
    
    -- Adicionar hash ao payload
    v_full_payload := v_full_payload || jsonb_build_object('dedup_hash', v_dedup_hash);
    
    -- Inserir evento derivado
    INSERT INTO public.domain_events (
        profile_id,
        entity_type,
        entity_id,
        event_type,
        event_source,
        payload,
        occurred_at
    ) VALUES (
        p_profile_id,
        p_entity_type,
        p_entity_id,
        p_event_type,
        'automation',  -- Eventos derivados sempre vêm de automação
        v_full_payload,
        NOW()
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
    
EXCEPTION WHEN OTHERS THEN
    -- Log erro mas não propaga (fail gracefully)
    INSERT INTO public.event_ingestion_errors (
        profile_id, source_table, event_type, error_message, error_detail
    ) VALUES (
        p_profile_id, 'derived_events', p_event_type, SQLERRM,
        jsonb_build_object('payload_size', v_payload_size, 'sqlstate', SQLSTATE)
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_safe_emit_derived_event IS 
'Emite evento derivado com validações de tamanho, deduplicação e versionamento.
Retorna event_id ou NULL se duplicado/erro.
NUNCA propaga exceções (fail gracefully).';

-- ============================================================================
-- PARTE 5: FUNÇÃO HELPER - OBTER ÚLTIMO EVENTO PROCESSADO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_last_processed_event_id(
    p_profile_id UUID,
    p_observer_name TEXT
) RETURNS UUID AS $$
DECLARE
    v_last_event_id UUID;
BEGIN
    SELECT last_processed_event_id INTO v_last_event_id
    FROM public.observer_state
    WHERE profile_id = p_profile_id
      AND observer_name = p_observer_name;
    
    RETURN v_last_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_get_last_processed_event_id IS 
'Retorna o ID do último evento processado por um observer (watermark).
Retorna NULL se nunca executado.';

-- ============================================================================
-- PARTE 6: FUNÇÃO HELPER - MARCAR EXECUÇÃO DE OBSERVER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_mark_observer_execution(
    p_profile_id UUID,
    p_observer_name TEXT,
    p_observer_version TEXT,
    p_last_event_id UUID,
    p_events_generated INTEGER,
    p_events_skipped INTEGER,
    p_events_analyzed INTEGER,
    p_status TEXT,
    p_error_message TEXT DEFAULT NULL,
    p_execution_duration_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_execution_id UUID;
BEGIN
    -- Inserir log de execução
    INSERT INTO public.observer_execution_log (
        profile_id, observer_name, observer_version,
        status, events_generated, events_skipped, events_analyzed,
        error_message, execution_duration_ms, completed_at
    ) VALUES (
        p_profile_id, p_observer_name, p_observer_version,
        p_status, p_events_generated, p_events_skipped, p_events_analyzed,
        p_error_message, p_execution_duration_ms, NOW()
    ) RETURNING id INTO v_execution_id;
    
    -- Atualizar estado do observer
    INSERT INTO public.observer_state (
        profile_id, observer_name, last_processed_event_id, last_processed_at
    ) VALUES (
        p_profile_id, p_observer_name, p_last_event_id, NOW()
    )
    ON CONFLICT (profile_id, observer_name) DO UPDATE SET
        last_processed_event_id = EXCLUDED.last_processed_event_id,
        last_processed_at = EXCLUDED.last_processed_at,
        updated_at = NOW();
    
    RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_mark_observer_execution IS 
'Registra execução de observer no log e atualiza watermark.
Retorna execution_id para referência.';

-- ============================================================================
-- PARTE 7: VIEW DE MONITORAMENTO
-- ============================================================================

CREATE OR REPLACE VIEW public.v_observer_health AS
SELECT 
    os.profile_id,
    os.observer_name,
    det.display_name,
    det.enabled,
    os.last_processed_at,
    EXTRACT(EPOCH FROM (NOW() - os.last_processed_at))/3600 AS hours_since_last_run,
    
    -- Última execução
    (SELECT status FROM public.observer_execution_log 
     WHERE profile_id = os.profile_id AND observer_name = os.observer_name 
     ORDER BY started_at DESC LIMIT 1) AS last_status,
    
    (SELECT events_generated FROM public.observer_execution_log 
     WHERE profile_id = os.profile_id AND observer_name = os.observer_name 
     ORDER BY started_at DESC LIMIT 1) AS last_events_generated,
    
    -- Estatísticas últimas 24h
    (SELECT COUNT(*) FROM public.observer_execution_log 
     WHERE profile_id = os.profile_id AND observer_name = os.observer_name 
     AND started_at >= NOW() - INTERVAL '24 hours') AS executions_last_24h,
    
    (SELECT SUM(events_generated) FROM public.observer_execution_log 
     WHERE profile_id = os.profile_id AND observer_name = os.observer_name 
     AND started_at >= NOW() - INTERVAL '24 hours') AS events_generated_last_24h

FROM public.observer_state os
JOIN public.derived_event_types det ON det.observer_function = os.observer_name
ORDER BY os.profile_id, os.observer_name;

ALTER VIEW public.v_observer_health SET (security_invoker = on);

COMMENT ON VIEW public.v_observer_health IS 
'Status de saúde dos observers: última execução, taxa de eventos, etc.';

-- ============================================================================
-- PARTE 8: GRANTS
-- ============================================================================

GRANT SELECT ON public.derived_event_types TO authenticated;
GRANT SELECT ON public.observer_execution_log TO authenticated;
GRANT SELECT ON public.observer_state TO authenticated;
GRANT SELECT ON public.v_observer_health TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
