-- Migration: 024_cleanup_assets_policy.sql
-- Description: Drop legacy unoptimized policy 'Users can view assets of their org' from assets table.
-- Author: Antigravity Agent

DO $$
BEGIN
    -- Fix 'assets' table legacy policy
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assets') THEN
        
        -- Drop the specific legacy policy identified in the screenshot
        DROP POLICY IF EXISTS "Users can view assets of their org" ON public.assets;

        -- Note: Migration 022 already created the optimized 'Users can view own assets' policy.
        -- So we don't need to recreate it, just removing the old one fixes the warning
        -- and removes the duplicate/conflicting logic.
            
    END IF;
END $$;
