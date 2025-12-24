-- Migration: 096_optimize_movimentacoes_rls_performance.sql
-- Description: Optimize RLS policies for movimentacoes table
-- Author: AI Assistant
-- Date: 2024-12-24
--
-- Issue: Supabase linter warns that auth.uid() is being re-evaluated for each row
-- Fix: Replace auth.uid() with (SELECT auth.uid()) to evaluate once per query
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization movimentacoes" ON movimentacoes;
DROP POLICY IF EXISTS "Users can insert organization movimentacoes" ON movimentacoes;
DROP POLICY IF EXISTS "Users can update organization movimentacoes" ON movimentacoes;
DROP POLICY IF EXISTS "Users can delete organization movimentacoes" ON movimentacoes;

-- ============================================================================
-- OPTIMIZED POLICIES - auth.uid() wrapped in SELECT
-- ============================================================================

CREATE POLICY "Users can view organization movimentacoes"
ON movimentacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = (SELECT auth.uid())  -- ✅ Optimized
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = (SELECT auth.uid())  -- ✅ Optimized
);

CREATE POLICY "Users can insert organization movimentacoes"
ON movimentacoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = (SELECT auth.uid())  -- ✅ Optimized
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = (SELECT auth.uid())  -- ✅ Optimized
);

CREATE POLICY "Users can update organization movimentacoes"
ON movimentacoes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = (SELECT auth.uid())  -- ✅ Optimized
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = (SELECT auth.uid())  -- ✅ Optimized
);

CREATE POLICY "Users can delete organization movimentacoes"
ON movimentacoes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = (SELECT auth.uid())  -- ✅ Optimized
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = (SELECT auth.uid())  -- ✅ Optimized
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view organization movimentacoes" ON movimentacoes IS
'Organization-aware SELECT policy with optimized auth.uid() calls (evaluated once per query)';

COMMENT ON POLICY "Users can insert organization movimentacoes" ON movimentacoes IS
'Organization-aware INSERT policy with optimized auth.uid() calls (evaluated once per query)';

COMMENT ON POLICY "Users can update organization movimentacoes" ON movimentacoes IS
'Organization-aware UPDATE policy with optimized auth.uid() calls (evaluated once per query)';

COMMENT ON POLICY "Users can delete organization movimentacoes" ON movimentacoes IS
'Organization-aware DELETE policy with optimized auth.uid() calls (evaluated once per query)';
