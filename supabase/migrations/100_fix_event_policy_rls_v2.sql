-- Migration: 100_fix_event_policy_rls_v2.sql
-- Description: Fix multiple permissive policies warning - separate by action
-- Author: AI Assistant
-- Date: 2024-12-24
-- ============================================================================

-- Problem: FOR ALL includes SELECT, creating multiple SELECT policies
-- Solution: Use specific actions (INSERT, UPDATE, DELETE) instead of ALL

-- Drop all existing policies
DROP POLICY IF EXISTS "event_policy_select" ON public.event_policy;
DROP POLICY IF EXISTS "event_policy_admin_modify" ON public.event_policy;

-- Single SELECT policy - everyone can read config
CREATE POLICY "event_policy_select"
ON public.event_policy
FOR SELECT
USING (true);

-- Separate policies for modifications (only ADMIN)
CREATE POLICY "event_policy_insert"
ON public.event_policy
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.operium_profiles
        WHERE user_id = (SELECT auth.uid())
        AND role = 'ADMIN'
        AND active = true
    )
);

CREATE POLICY "event_policy_update"
ON public.event_policy
FOR UPDATE
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

CREATE POLICY "event_policy_delete"
ON public.event_policy
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.operium_profiles
        WHERE user_id = (SELECT auth.uid())
        AND role = 'ADMIN'
        AND active = true
    )
);
