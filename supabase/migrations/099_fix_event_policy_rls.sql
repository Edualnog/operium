-- Migration: 099_fix_event_policy_rls.sql
-- Description: Fix RLS performance warnings for event_policy table
-- Author: AI Assistant
-- Date: 2024-12-24
-- ============================================================================

-- Problem: Multiple permissive policies for SELECT on event_policy table
-- - event_policy_admin_only (uses auth.uid() without SELECT wrapper)
-- - event_policy_read_all (allows all reads)
--
-- Solution: Keep only one optimized policy since event_policy is a
-- configuration table that should be readable by all authenticated users

-- Drop existing policies
DROP POLICY IF EXISTS "event_policy_admin_only" ON public.event_policy;
DROP POLICY IF EXISTS "event_policy_read_all" ON public.event_policy;

-- Create single optimized read policy
-- event_policy is a configuration table - everyone can read
CREATE POLICY "event_policy_select"
ON public.event_policy
FOR SELECT
USING (true);

-- Create admin-only policy for modifications (INSERT, UPDATE, DELETE)
-- Uses (SELECT auth.uid()) pattern to avoid re-evaluation per row
-- Checks operium_profiles.role = 'ADMIN'
CREATE POLICY "event_policy_admin_modify"
ON public.event_policy
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.operium_profiles
        WHERE user_id = (SELECT auth.uid())
        AND role = 'ADMIN'
        AND active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.operium_profiles
        WHERE user_id = (SELECT auth.uid())
        AND role = 'ADMIN'
        AND active = true
    )
);
