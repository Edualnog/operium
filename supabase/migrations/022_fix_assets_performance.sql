-- Migration: 022_fix_assets_performance.sql
-- Description: Fix "Auth RLS Initialization Plan" for 'assets' table using 'org_id'.
-- Author: Antigravity Agent

DO $$
BEGIN
    -- Fix 'assets' table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assets') THEN
        -- Check if it uses org_id (confirmed by user screenshot)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='org_id') THEN
            
            -- Recreate Policies with Optimization (select auth.uid())
            DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
            DROP POLICY IF EXISTS "Users can insert own assets" ON public.assets;
            DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
            DROP POLICY IF EXISTS "Users can delete own assets" ON public.assets;

            -- Assuming standard CRUD ownership
            CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT USING (org_id = (select auth.uid()));
            CREATE POLICY "Users can insert own assets" ON public.assets FOR INSERT WITH CHECK (org_id = (select auth.uid()));
            CREATE POLICY "Users can update own assets" ON public.assets FOR UPDATE USING (org_id = (select auth.uid()));
            CREATE POLICY "Users can delete own assets" ON public.assets FOR DELETE USING (org_id = (select auth.uid()));
            
        END IF;
    END IF;
END $$;
