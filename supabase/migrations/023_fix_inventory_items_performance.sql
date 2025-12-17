-- Migration: 023_fix_inventory_items_performance.sql
-- Description: Fix "Auth RLS Initialization Plan" for 'inventory_items' table.
-- Author: Antigravity Agent

DO $$
BEGIN
    -- Fix 'inventory_items' table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_items') THEN
        
        -- Drop the identified policy
        DROP POLICY IF EXISTS "Users can view inventory of their org" ON public.inventory_items;

        -- Recreate with performance optimization (select auth.uid())
        -- Note: Preserving existing logic which was just checking for authentication.
        CREATE POLICY "Users can view inventory of their org" 
        ON public.inventory_items 
        FOR SELECT 
        USING ((select auth.uid()) IS NOT NULL);
            
    END IF;
END $$;
