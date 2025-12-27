-- ============================================================================
-- Migration 135: Fix RLS Performance Warnings
-- ============================================================================
-- Corrige avisos de performance do Supabase Linter:
-- 1. auth_rls_initplan - wrap auth.uid() com (SELECT auth.uid())
-- 2. multiple_permissive_policies - consolidar políticas duplicadas
-- ============================================================================

-- ============================================================================
-- PARTE 1: Corrigir políticas de vehicles (auth_rls_initplan)
-- ============================================================================

DROP POLICY IF EXISTS "Users can select own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;

-- SELECT: usuário pode ver seus próprios veículos
CREATE POLICY "Users can select own vehicles"
ON public.vehicles
FOR SELECT
USING (profile_id = (SELECT auth.uid()));

-- INSERT: usuário pode criar veículos para si
CREATE POLICY "Users can insert own vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (profile_id = (SELECT auth.uid()));

-- UPDATE: usuário pode atualizar seus próprios veículos
CREATE POLICY "Users can update own vehicles"
ON public.vehicles
FOR UPDATE
USING (profile_id = (SELECT auth.uid()))
WITH CHECK (profile_id = (SELECT auth.uid()));

-- DELETE: usuário pode deletar seus próprios veículos
CREATE POLICY "Users can delete own vehicles"
ON public.vehicles
FOR DELETE
USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PARTE 2: Corrigir política de operium_profiles (auth_rls_initplan)
-- ============================================================================

DROP POLICY IF EXISTS "operium_profiles_select" ON public.operium_profiles;

CREATE POLICY "operium_profiles_select" ON public.operium_profiles
FOR SELECT USING (
    org_id = (SELECT get_user_org_id()) OR user_id = (SELECT auth.uid())
);

-- ============================================================================
-- PARTE 3: Corrigir política de teams (auth_rls_initplan)
-- ============================================================================

DROP POLICY IF EXISTS "teams_select_org" ON public.teams;

CREATE POLICY "teams_select_org" ON public.teams
FOR SELECT USING (
    -- Dashboard users: can see teams from their profile
    profile_id = (SELECT auth.uid())
    OR
    -- Operium app users: can see teams from their org
    profile_id IN (
        SELECT org_id FROM operium_profiles
        WHERE user_id = (SELECT auth.uid()) AND active = true
    )
);

-- ============================================================================
-- PARTE 4: Consolidar políticas duplicadas de vehicles
-- Remover "Operium users can view org vehicles" pois já está coberto
-- pela política "Users can select own vehicles" + nova lógica
-- ============================================================================

DROP POLICY IF EXISTS "Operium users can view org vehicles" ON public.vehicles;

-- Atualizar a política de SELECT para incluir tanto dashboard quanto operium
DROP POLICY IF EXISTS "Users can select own vehicles" ON public.vehicles;

CREATE POLICY "Users can select own vehicles"
ON public.vehicles
FOR SELECT
USING (
    -- Dashboard users: own vehicles
    profile_id = (SELECT auth.uid())
    OR
    -- Operium app users: vehicles from their org
    profile_id IN (
        SELECT org_id FROM operium_profiles
        WHERE user_id = (SELECT auth.uid()) AND active = true
    )
);

-- ============================================================================
-- Comentários
-- ============================================================================

COMMENT ON POLICY "Users can select own vehicles" ON public.vehicles IS
'Allows users to view their own vehicles (dashboard) or org vehicles (operium app). Optimized with subqueries.';

COMMENT ON POLICY "operium_profiles_select" ON public.operium_profiles IS
'Allows users to view profiles from their org or their own profile. Optimized with subqueries.';

COMMENT ON POLICY "teams_select_org" ON public.teams IS
'Allows users to view teams they own (dashboard) or from their org (operium app). Optimized with subqueries.';
