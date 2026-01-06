-- ============================================================================
-- Migration 147: Consolidate and Optimize ALL RLS Policies
-- Description: Remove duplicate policies and optimize auth.uid() calls
-- Author: AI Assistant
-- Date: 2026-01-06
-- 
-- Fixes:
-- 1. Multiple permissive policies (duplicates)
-- 2. Auth RLS InitPlan warnings (auth.uid() without SELECT)
-- ============================================================================

-- ============================================================================
-- PARTE 1: PROFILES - Remove duplicates + Optimize
-- ============================================================================

-- Remove ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Create optimized policies
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update" ON public.profiles
    FOR UPDATE USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_insert" ON public.profiles
    FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- PARTE 2: COLABORADORES - Remove duplicates + Optimize
-- ============================================================================

-- Remove ALL existing policies
DROP POLICY IF EXISTS "Users can view own colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Users can insert own colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Users can update own colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Users can delete own colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Organization members can view colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_select" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_insert" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_update" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_delete" ON public.colaboradores;

-- Create optimized policies
CREATE POLICY "colaboradores_select" ON public.colaboradores
    FOR SELECT USING (
        profile_id = (SELECT auth.uid())
        OR profile_id IN (
            SELECT op.user_id
            FROM public.operium_profiles op
            WHERE op.org_id = (SELECT get_user_org_id())
            AND op.active = true
        )
    );

CREATE POLICY "colaboradores_insert" ON public.colaboradores
    FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "colaboradores_update" ON public.colaboradores
    FOR UPDATE USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "colaboradores_delete" ON public.colaboradores
    FOR DELETE USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PARTE 3: FERRAMENTAS - Remove duplicates + Optimize
-- ============================================================================

-- Remove ALL existing policies
DROP POLICY IF EXISTS "Users can view own ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "Users can insert own ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "Users can update own ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "Users can delete own ferramentas" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_select" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_insert" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_update" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_delete" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_owner_all" ON public.ferramentas;

-- Create optimized policies (with org access)
CREATE POLICY "ferramentas_select" ON public.ferramentas
    FOR SELECT USING (
        profile_id = (SELECT auth.uid())
        OR id IN (
            SELECT te.ferramenta_id
            FROM public.team_equipment te
            INNER JOIN public.teams t ON t.id = te.team_id
            WHERE t.org_id = (SELECT get_user_org_id())
        )
        OR profile_id IN (
            SELECT op.user_id
            FROM public.operium_profiles op
            WHERE op.org_id = (SELECT get_user_org_id())
            AND op.active = true
        )
    );

CREATE POLICY "ferramentas_insert" ON public.ferramentas
    FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "ferramentas_update" ON public.ferramentas
    FOR UPDATE USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "ferramentas_delete" ON public.ferramentas
    FOR DELETE USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PARTE 4: MOVIMENTACOES - Remove duplicates + Optimize
-- ============================================================================

-- Remove ALL existing policies
DROP POLICY IF EXISTS "Users can view own movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can insert own movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can update own movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can delete own movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can view organization movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can insert organization movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can update organization movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "Users can delete organization movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "movimentacoes_select" ON public.movimentacoes;
DROP POLICY IF EXISTS "movimentacoes_insert" ON public.movimentacoes;
DROP POLICY IF EXISTS "movimentacoes_update" ON public.movimentacoes;
DROP POLICY IF EXISTS "movimentacoes_delete" ON public.movimentacoes;

-- Create optimized policies (consolidated org access)
CREATE POLICY "movimentacoes_select" ON public.movimentacoes
    FOR SELECT USING (
        profile_id = (SELECT auth.uid())
        OR profile_id IN (
            SELECT op.user_id
            FROM public.operium_profiles op
            WHERE op.org_id = (SELECT get_user_org_id())
            AND op.active = true
        )
    );

CREATE POLICY "movimentacoes_insert" ON public.movimentacoes
    FOR INSERT WITH CHECK (
        profile_id = (SELECT auth.uid())
        OR profile_id IN (
            SELECT op.user_id
            FROM public.operium_profiles op
            WHERE op.org_id = (SELECT get_user_org_id())
            AND op.active = true
        )
    );

CREATE POLICY "movimentacoes_update" ON public.movimentacoes
    FOR UPDATE USING (
        profile_id = (SELECT auth.uid())
        OR profile_id IN (
            SELECT op.user_id
            FROM public.operium_profiles op
            WHERE op.org_id = (SELECT get_user_org_id())
            AND op.active = true
        )
    )
    WITH CHECK (
        profile_id = (SELECT auth.uid())
        OR profile_id IN (
            SELECT op.user_id
            FROM public.operium_profiles op
            WHERE op.org_id = (SELECT get_user_org_id())
            AND op.active = true
        )
    );

CREATE POLICY "movimentacoes_delete" ON public.movimentacoes
    FOR DELETE USING (
        profile_id = (SELECT auth.uid())
        OR profile_id IN (
            SELECT op.user_id
            FROM public.operium_profiles op
            WHERE op.org_id = (SELECT get_user_org_id())
            AND op.active = true
        )
    );

-- ============================================================================
-- PARTE 5: CONSERTOS - Remove duplicates + Optimize
-- ============================================================================

-- Remove ALL existing policies
DROP POLICY IF EXISTS "Users can view own consertos" ON public.consertos;
DROP POLICY IF EXISTS "Users can insert own consertos" ON public.consertos;
DROP POLICY IF EXISTS "Users can update own consertos" ON public.consertos;
DROP POLICY IF EXISTS "Users can delete own consertos" ON public.consertos;
DROP POLICY IF EXISTS "consertos_select" ON public.consertos;
DROP POLICY IF EXISTS "consertos_insert" ON public.consertos;
DROP POLICY IF EXISTS "consertos_update" ON public.consertos;
DROP POLICY IF EXISTS "consertos_delete" ON public.consertos;

-- Create optimized policies
CREATE POLICY "consertos_select" ON public.consertos
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

CREATE POLICY "consertos_insert" ON public.consertos
    FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "consertos_update" ON public.consertos
    FOR UPDATE USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "consertos_delete" ON public.consertos
    FOR DELETE USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON POLICY "profiles_select" ON public.profiles IS
'Optimized: Users can view their own profile. auth.uid() executed once via SELECT subquery.';

COMMENT ON POLICY "colaboradores_select" ON public.colaboradores IS
'Optimized: Users can view own colaboradores or org members colaboradores. auth.uid() executed once.';

COMMENT ON POLICY "ferramentas_select" ON public.ferramentas IS
'Optimized: Users can view own ferramentas, team equipment, or org ferramentas. auth.uid() executed once.';

COMMENT ON POLICY "movimentacoes_select" ON public.movimentacoes IS
'Optimized: Users can view own movimentacoes or org movimentacoes. auth.uid() executed once.';

COMMENT ON POLICY "consertos_select" ON public.consertos IS
'Optimized: Users can view their own consertos. auth.uid() executed once via SELECT subquery.';
