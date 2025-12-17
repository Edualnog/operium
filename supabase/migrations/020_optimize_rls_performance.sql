-- Migration: 020_optimize_rls_performance.sql
-- Description: Optimize RLS policies to fix "Auth RLS Initialization Plan" warnings
-- Author: Antigravity Agent

-- 1. Optimize legal_agreements (Known table)
-- The optimization is wrapping auth.uid() in (select auth.uid()) 
-- which helps the planner treat it as a stable constant for the transaction.

DROP POLICY IF EXISTS "Users can view own agreements" ON public.legal_agreements;
CREATE POLICY "Users can view own agreements" 
    ON public.legal_agreements 
    FOR SELECT 
    USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own agreements" ON public.legal_agreements;
CREATE POLICY "Users can insert own agreements" 
    ON public.legal_agreements 
    FOR INSERT 
    WITH CHECK (profile_id = (select auth.uid()));

-- 2. Note on other tables (assets, inventory_items)
-- These tables are not present in the tracked migrations (001-019). 
-- If they exist in your database, you should apply the same pattern:
-- column_name = (select auth.uid())
