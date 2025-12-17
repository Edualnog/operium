-- Migration: 019_secure_search_paths.sql
-- Description: Fix "Function Search Path Mutable" warnings by explicitly setting search_path
-- Author: Antigravity Agent
-- Note: Rewritten to use Dynamic SQL to avoid "function does not exist" errors due to signature mismatches.

-- 1. Analytics Functions (We know these match Migration 016)
ALTER FUNCTION analytics.calculate_volume_metrics(UUID) SET search_path = public, analytics, extensions;
ALTER FUNCTION analytics.calculate_diversity_metrics(UUID) SET search_path = public, analytics, extensions;
ALTER FUNCTION analytics.calculate_stability_metrics(UUID) SET search_path = public, analytics, extensions;
ALTER FUNCTION analytics.refresh_confidence_scores() SET search_path = public, analytics, extensions;

-- 2. Dynamic Fix for Public Functions
-- Instead of guessing signatures (e.g. UUID vs Text), we query the system catalog.
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure as func_signature
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          -- Filter for the specific functions flagged in the screenshot to be targeted but safe
          AND proname IN (
              'emit_asset_failure_signal',
              'is_admin',
              'update_almox_score',
              'emit_legacy_ferramenta_event',
              'emit_ferramenta_signal',
              'track_event'
          )
    LOOP
        -- Execute ALTER for each found signature
        EXECUTE 'ALTER FUNCTION ' || r.func_signature || ' SET search_path = public, extensions, temp;';
    END LOOP;
END $$;
