-- ============================================================================
-- Migration: 109_optimize_observer_rls_performance.sql
-- Description: Otimiza RLS policy para usar SELECT auth.uid()
-- Author: AI Assistant
-- Date: 2024-12-24
-- ============================================================================

-- Corrigir warning de performance: auth_rls_initplan
-- Trocar auth.uid() por (SELECT auth.uid()) para evitar re-avaliação por linha

DROP POLICY IF EXISTS "observer_execution_log_select_own" ON public.observer_execution_log;

CREATE POLICY "observer_execution_log_select_own"
    ON public.observer_execution_log
    FOR SELECT
    USING (profile_id = (SELECT auth.uid()));

COMMENT ON POLICY "observer_execution_log_select_own" ON public.observer_execution_log IS
'Usuários podem ver logs de execução apenas do próprio profile_id.
OTIMIZADO: Usa (SELECT auth.uid()) para evitar re-avaliação por linha.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
