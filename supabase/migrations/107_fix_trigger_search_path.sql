-- ============================================================================
-- Migration 107: Fix trigger functions to use correct search_path
-- Problem: Functions have search_path = '' but reference tables without schema
-- Solution: Set search_path = 'public' so tables are found correctly
-- ============================================================================

-- Fix fn_generic_event_trigger search_path
ALTER FUNCTION public.fn_generic_event_trigger()
SET search_path = 'public';

-- Fix fn_emit_domain_event search_path
DO $$
BEGIN
    -- Try to alter the function with the most common signature
    BEGIN
        ALTER FUNCTION public.fn_emit_domain_event(UUID, TEXT, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ)
        SET search_path = 'public';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not alter fn_emit_domain_event: %', SQLERRM;
    END;
END;
$$;

-- Fix fn_auto_event_context search_path
DO $$
BEGIN
    ALTER FUNCTION public.fn_auto_event_context()
    SET search_path = 'public';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter fn_auto_event_context: %', SQLERRM;
END;
$$;

-- Fix fn_calculate_changed_fields search_path
DO $$
BEGIN
    ALTER FUNCTION public.fn_calculate_changed_fields(JSONB, JSONB)
    SET search_path = 'public';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter fn_calculate_changed_fields: %', SQLERRM;
END;
$$;

-- Verify the fix
DO $$
DECLARE
    v_search_path TEXT;
BEGIN
    SELECT proconfig::text INTO v_search_path
    FROM pg_proc
    WHERE proname = 'fn_generic_event_trigger';

    RAISE NOTICE 'fn_generic_event_trigger search_path is now: %', v_search_path;
END;
$$;

-- Grant proper permissions on event_ingestion_errors
GRANT SELECT, INSERT ON public.event_ingestion_errors TO authenticated;
GRANT SELECT, INSERT ON public.event_ingestion_errors TO anon;
GRANT SELECT, INSERT ON public.event_ingestion_errors TO service_role;
