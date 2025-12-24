-- Migration: 092_fix_ferramentas_rls_for_teams.sql
-- Description: Fix ferramentas RLS to allow team members to see equipment
-- Author: AI Assistant
-- Date: 2024-12-23
--
-- Bug: Migration 091 set ferramentas policy to profile_id = auth.uid() only,
-- which blocks team members from seeing equipment names in team_equipment joins.
--
-- Fix: Allow SELECT on ferramentas for:
--   1. Owner (profile_id = auth.uid())
--   2. Team members who have this ferramenta assigned via team_equipment
--   3. Users in the same organization (via profile -> operium_profiles -> org_id)
-- ============================================================================

-- Drop the overly restrictive policy from migration 091
DROP POLICY IF EXISTS "ferramentas_owner_all" ON public.ferramentas;

-- Separate policies for different operations

-- SELECT: Allow viewing ferramentas that:
-- 1. User owns (profile_id = auth.uid())
-- 2. Are assigned to user's team via team_equipment
-- 3. Belong to a user in the same organization
CREATE POLICY "ferramentas_select" ON public.ferramentas
FOR SELECT USING (
    -- User owns this ferramenta
    profile_id = (SELECT auth.uid())
    -- OR ferramenta is assigned to user's team
    OR id IN (
        SELECT te.ferramenta_id
        FROM public.team_equipment te
        INNER JOIN public.teams t ON t.id = te.team_id
        WHERE t.org_id = (SELECT get_user_org_id())
    )
    -- OR ferramenta belongs to someone in the same organization
    OR profile_id IN (
        SELECT op.user_id
        FROM public.operium_profiles op
        WHERE op.org_id = (SELECT get_user_org_id())
        AND op.active = true
    )
);

-- INSERT: Only owner can create (uses their profile_id)
CREATE POLICY "ferramentas_insert" ON public.ferramentas
FOR INSERT WITH CHECK (
    profile_id = (SELECT auth.uid())
);

-- UPDATE: Only owner can update their ferramentas
CREATE POLICY "ferramentas_update" ON public.ferramentas
FOR UPDATE USING (
    profile_id = (SELECT auth.uid())
) WITH CHECK (
    profile_id = (SELECT auth.uid())
);

-- DELETE: Only owner can delete their ferramentas
CREATE POLICY "ferramentas_delete" ON public.ferramentas
FOR DELETE USING (
    profile_id = (SELECT auth.uid())
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "ferramentas_select" ON public.ferramentas IS
'Users can view: their own ferramentas, ferramentas assigned to org teams, or ferramentas owned by org members';

COMMENT ON POLICY "ferramentas_insert" ON public.ferramentas IS
'Users can only create ferramentas with their own profile_id';

COMMENT ON POLICY "ferramentas_update" ON public.ferramentas IS
'Users can only update their own ferramentas';

COMMENT ON POLICY "ferramentas_delete" ON public.ferramentas IS
'Users can only delete their own ferramentas';
