-- Migration: 088_consolidate_rls_policies.sql
-- Description: Consolidate multiple permissive policies into single policies per action
-- Author: AI Assistant
-- Date: 2024-12-23
-- 
-- Fixes Supabase linter performance warnings about multiple permissive policies
-- ============================================================================

-- ============================================================================
-- 1. CONSOLIDATE ferramentas POLICIES
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can manage ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "Users can delete own ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "Users can insert own ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "Users can update own ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "Users can view own ferramentas" ON public.ferramentas;

-- Create single consolidated policy for all actions
CREATE POLICY "ferramentas_authenticated_all" ON public.ferramentas
    FOR ALL 
    TO authenticated
    USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- 2. CONSOLIDATE teams POLICIES
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Operium users can view org teams" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_org" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_org" ON public.teams;
DROP POLICY IF EXISTS "teams_select_org" ON public.teams;
DROP POLICY IF EXISTS "teams_update_org" ON public.teams;

-- Create single consolidated policy for all actions
CREATE POLICY "teams_authenticated_all" ON public.teams
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 3. CONSOLIDATE team_equipment POLICIES (if duplicates exist)
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can manage team equipment" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_delete_org" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_insert_org" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_select_org" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_update_org" ON public.team_equipment;

-- Create single consolidated policy for all actions
CREATE POLICY "team_equipment_authenticated_all" ON public.team_equipment
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON POLICY "ferramentas_authenticated_all" ON public.ferramentas IS 
'Consolidated RLS policy - users can manage their own ferramentas (profile_id = auth.uid)';

COMMENT ON POLICY "teams_authenticated_all" ON public.teams IS 
'Consolidated RLS policy - authenticated users can manage teams';

COMMENT ON POLICY "team_equipment_authenticated_all" ON public.team_equipment IS 
'Consolidated RLS policy - authenticated users can manage team equipment';

