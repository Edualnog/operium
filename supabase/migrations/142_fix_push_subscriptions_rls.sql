-- ============================================================================
-- Migration 142: Fix push_subscriptions RLS policy performance
-- Uses (select auth.uid()) instead of auth.uid() to avoid re-evaluation per row
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;

-- Recreate with optimized auth.uid() call
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
