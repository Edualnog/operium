-- ============================================================================
-- Migration 128: Fix duplicate RLS policies on assets table
-- Consolida políticas permissivas duplicadas para melhor performance
-- ============================================================================

-- Remove todas as políticas existentes para evitar duplicatas
DROP POLICY IF EXISTS "Users can manage own org assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view own org assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON public.assets;

-- Cria políticas únicas e consolidadas usando org_id
CREATE POLICY "Users can view own org assets"
ON public.assets
FOR SELECT
USING (org_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own org assets"
ON public.assets
FOR INSERT
WITH CHECK (org_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own org assets"
ON public.assets
FOR UPDATE
USING (org_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own org assets"
ON public.assets
FOR DELETE
USING (org_id = (SELECT auth.uid()));

COMMENT ON POLICY "Users can view own org assets" ON public.assets IS
'Permite visualizar assets da própria organização';
