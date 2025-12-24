-- Migration: 098_fix_function_search_path.sql
-- Description: Fix function search_path mutable warnings for event enforcement functions
-- Author: AI Assistant
-- Date: 2024-12-24
-- ============================================================================

-- Fix search_path for all event enforcement functions
-- This prevents search_path injection attacks (security best practice)

-- fn_emit_domain_event(UUID, TEXT, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ)
ALTER FUNCTION public.fn_emit_domain_event(UUID, TEXT, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ)
SET search_path = '';

-- fn_calculate_changed_fields(JSONB, JSONB)
ALTER FUNCTION public.fn_calculate_changed_fields(JSONB, JSONB)
SET search_path = '';

-- fn_generic_event_trigger()
ALTER FUNCTION public.fn_generic_event_trigger()
SET search_path = '';

-- fn_auto_event_context()
ALTER FUNCTION public.fn_auto_event_context()
SET search_path = '';

-- fn_detect_missing_events(UUID, INTEGER)
ALTER FUNCTION public.fn_detect_missing_events(UUID, INTEGER)
SET search_path = '';

-- fn_calculate_event_coverage(UUID, INTEGER)
ALTER FUNCTION public.fn_calculate_event_coverage(UUID, INTEGER)
SET search_path = '';

-- fn_event_pipeline_health_check(UUID)
ALTER FUNCTION public.fn_event_pipeline_health_check(UUID)
SET search_path = '';

-- fn_backfill_missing_events(UUID, TEXT, INTEGER)
ALTER FUNCTION public.fn_backfill_missing_events(UUID, TEXT, INTEGER)
SET search_path = '';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_unsafe_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_unsafe_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'fn_emit_domain_event',
          'fn_calculate_changed_fields',
          'fn_generic_event_trigger',
          'fn_auto_event_context',
          'fn_detect_missing_events',
          'fn_calculate_event_coverage',
          'fn_event_pipeline_health_check',
          'fn_backfill_missing_events'
      )
      AND p.proconfig IS NULL;

    IF v_unsafe_count > 0 THEN
        RAISE WARNING '% functions still without search_path configuration', v_unsafe_count;
    ELSE
        RAISE NOTICE 'All event enforcement functions now have secure search_path';
    END IF;
END;
$$;
