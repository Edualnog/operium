-- ============================================================================
-- Migration 146: Fix RLS Performance Warnings
-- Description: Otimiza políticas RLS envolvendo auth.uid() em subqueries
-- Author: AI Assistant
-- Date: 2026-01-06
-- 
-- Problema: auth.uid() é reavaliado para cada linha nas políticas RLS
-- Solução: Usar (SELECT auth.uid()) para avaliar uma única vez
-- Referência: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- ============================================================================
-- PARTE 1: collaborator_operational_profile
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can view own collaborator profiles" ON public.collaborator_operational_profile
    FOR SELECT USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Users can insert own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can insert own collaborator profiles" ON public.collaborator_operational_profile
    FOR INSERT WITH CHECK (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Users can update own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can update own collaborator profiles" ON public.collaborator_operational_profile
    FOR UPDATE USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Users can delete own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can delete own collaborator profiles" ON public.collaborator_operational_profile
    FOR DELETE USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

-- ============================================================================
-- PARTE 2: collaborator_role_history
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own collaborator role history" ON public.collaborator_role_history;
CREATE POLICY "Users can view own collaborator role history" ON public.collaborator_role_history
    FOR SELECT USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Users can insert own collaborator role history" ON public.collaborator_role_history;
CREATE POLICY "Users can insert own collaborator role history" ON public.collaborator_role_history
    FOR INSERT WITH CHECK (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

-- ============================================================================
-- PARTE 3: event_ingestion_config
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own config" ON public.event_ingestion_config;
CREATE POLICY "Users can manage own config" ON public.event_ingestion_config
    FOR ALL USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PARTE 4: event_ingestion_errors
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own errors" ON public.event_ingestion_errors;
CREATE POLICY "Users can view own errors" ON public.event_ingestion_errors
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own errors" ON public.event_ingestion_errors;
CREATE POLICY "Users can insert own errors" ON public.event_ingestion_errors
    FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON POLICY "Users can view own collaborator profiles" ON public.collaborator_operational_profile IS
'Otimizado: auth.uid() executado uma vez via subquery';

COMMENT ON POLICY "Users can manage own config" ON public.event_ingestion_config IS
'Otimizado: auth.uid() executado uma vez via subquery';

COMMENT ON POLICY "Users can view own errors" ON public.event_ingestion_errors IS
'Otimizado: auth.uid() executado uma vez via subquery';
