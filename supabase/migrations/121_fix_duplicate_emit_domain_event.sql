-- =====================================================
-- FIX: Remove duplicate fn_emit_domain_event functions
-- Error: "function public.fn_emit_domain_event(...) is not unique"
-- =====================================================

-- First, list all versions of the function
DO $$
DECLARE
    func_record RECORD;
    drop_stmt TEXT;
BEGIN
    RAISE NOTICE 'Dropping all existing fn_emit_domain_event functions...';
    
    FOR func_record IN
        SELECT pg_proc.oid, 
               pg_catalog.pg_get_function_identity_arguments(pg_proc.oid) as args
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE proname = 'fn_emit_domain_event' 
        AND nspname = 'public'
    LOOP
        drop_stmt := 'DROP FUNCTION IF EXISTS public.fn_emit_domain_event(' || func_record.args || ') CASCADE';
        RAISE NOTICE 'Executing: %', drop_stmt;
        EXECUTE drop_stmt;
    END LOOP;
    
    RAISE NOTICE 'All fn_emit_domain_event functions dropped.';
END $$;

-- Recreate the SINGLE canonical version
CREATE OR REPLACE FUNCTION public.fn_emit_domain_event(
    p_org_id UUID,
    p_profile_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_event_type TEXT,
    p_event_source TEXT DEFAULT 'SYSTEM',
    p_payload JSONB DEFAULT '{}'::JSONB,
    p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
    v_allowed_entity_types TEXT[] := ARRAY[
        'COLABORADOR', 'FERRAMENTA', 'CONSERTO', 'MOVIMENTACAO', 
        'VEICULO', 'EQUIPE', 'INVENTARIO', 'RELATORIO',
        'VEHICLE_COST', 'VEHICLE_USAGE', 'TEAM_EQUIPMENT'
    ];
    v_allowed_sources TEXT[] := ARRAY[
        'SYSTEM', 'ADMIN', 'TRIGGER', 'API', 'CRON', 'MANUAL', 'MOBILE_APP'
    ];
BEGIN
    -- Validate entity_type
    IF p_entity_type IS NOT NULL AND NOT (p_entity_type = ANY(v_allowed_entity_types)) THEN
        RAISE WARNING 'fn_emit_domain_event: entity_type "%" não está na lista permitida, mas será aceito', p_entity_type;
    END IF;
    
    -- Validate event_source
    IF p_event_source IS NOT NULL AND NOT (p_event_source = ANY(v_allowed_sources)) THEN
        RAISE WARNING 'fn_emit_domain_event: event_source "%" não está na lista permitida, mas será aceito', p_event_source;
    END IF;
    
    -- Insert the event
    INSERT INTO public.domain_events (
        org_id,
        profile_id,
        entity_type,
        entity_id,
        event_type,
        event_source,
        payload,
        occurred_at
    ) VALUES (
        p_org_id,
        p_profile_id,
        COALESCE(p_entity_type, 'UNKNOWN'),
        p_entity_id,
        p_event_type,
        COALESCE(p_event_source, 'SYSTEM'),
        COALESCE(p_payload, '{}'::JSONB),
        COALESCE(p_occurred_at, NOW())
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'fn_emit_domain_event failed: % - %', SQLSTATE, SQLERRM;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.fn_emit_domain_event IS 
'Emite um evento de domínio para o sistema de observabilidade.
Parâmetros:
  - p_org_id: ID da organização
  - p_profile_id: ID do perfil/usuário (pode ser NULL para eventos de sistema)
  - p_entity_type: Tipo da entidade (COLABORADOR, FERRAMENTA, etc)
  - p_entity_id: ID da entidade
  - p_event_type: Tipo do evento (ex: COLABORADOR_ADMITIDO)
  - p_event_source: Origem do evento (SYSTEM, ADMIN, TRIGGER, etc)
  - p_payload: Dados adicionais em JSONB
  - p_occurred_at: Timestamp do evento (default: NOW())
';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_emit_domain_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_emit_domain_event TO service_role;
