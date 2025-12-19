-- Migration: 045_optimize_rls_performance.sql
-- Description: Otimiza RLS policies para melhor performance
-- Author: AI Assistant
-- Date: 2024-12-19
-- 
-- Problema: auth.uid() é reavaliado para cada linha
-- Solução: Usar (select auth.uid()) para avaliar uma única vez

-- ============================================================================
-- PARTE 1: REMOVER POLICIES DUPLICADAS
-- ============================================================================

-- collaborator_behavior_features - remover policy duplicada
DROP POLICY IF EXISTS "Block direct access to behavior features" ON public.collaborator_behavior_features;

-- operational_baselines - remover policy de view duplicada (manter apenas manage que já inclui SELECT)
DROP POLICY IF EXISTS "Users can view baselines of their profile" ON public.operational_baselines;

-- ============================================================================
-- PARTE 2: RECRIAR POLICIES COM (SELECT auth.uid())
-- ============================================================================

-- vehicles
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;
CREATE POLICY "Users can view own vehicles" ON public.vehicles
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

-- collaborator_operational_profile (usa collaborator_id -> colaboradores.profile_id)
DROP POLICY IF EXISTS "Users can view own collaborator profiles" ON public.collaborator_operational_profile;
DROP POLICY IF EXISTS "Users can insert own collaborator profiles" ON public.collaborator_operational_profile;
DROP POLICY IF EXISTS "Users can update own collaborator profiles" ON public.collaborator_operational_profile;
DROP POLICY IF EXISTS "Users can delete own collaborator profiles" ON public.collaborator_operational_profile;

CREATE POLICY "Users can view own collaborator profiles" ON public.collaborator_operational_profile
    FOR SELECT USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );
CREATE POLICY "Users can insert own collaborator profiles" ON public.collaborator_operational_profile
    FOR INSERT WITH CHECK (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );
CREATE POLICY "Users can update own collaborator profiles" ON public.collaborator_operational_profile
    FOR UPDATE USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );
CREATE POLICY "Users can delete own collaborator profiles" ON public.collaborator_operational_profile
    FOR DELETE USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

-- collaborator_behavior_features (usa user_id)
DROP POLICY IF EXISTS "Service role full access" ON public.collaborator_behavior_features;
CREATE POLICY "Service role full access" ON public.collaborator_behavior_features
    FOR ALL USING (
        (SELECT current_setting('role', true)) = 'service_role'
    );

-- collaborator_role_history (usa collaborator_id -> colaboradores.profile_id)
DROP POLICY IF EXISTS "Users can view own collaborator role history" ON public.collaborator_role_history;
DROP POLICY IF EXISTS "Users can insert own collaborator role history" ON public.collaborator_role_history;

CREATE POLICY "Users can view own collaborator role history" ON public.collaborator_role_history
    FOR SELECT USING (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );
CREATE POLICY "Users can insert own collaborator role history" ON public.collaborator_role_history
    FOR INSERT WITH CHECK (
        collaborator_id IN (SELECT id FROM public.colaboradores WHERE profile_id = (SELECT auth.uid()))
    );

-- vehicle_maintenances
DROP POLICY IF EXISTS "Users can view own vehicle maintenances" ON public.vehicle_maintenances;
CREATE POLICY "Users can view own vehicle maintenances" ON public.vehicle_maintenances
    FOR SELECT USING (
        vehicle_id IN (SELECT id FROM public.vehicles WHERE profile_id = (SELECT auth.uid()))
    );

-- vehicle_costs
DROP POLICY IF EXISTS "Users can view own vehicle costs" ON public.vehicle_costs;
CREATE POLICY "Users can view own vehicle costs" ON public.vehicle_costs
    FOR SELECT USING (
        vehicle_id IN (SELECT id FROM public.vehicles WHERE profile_id = (SELECT auth.uid()))
    );

-- vehicle_usage_events
DROP POLICY IF EXISTS "Users can view own vehicle usage" ON public.vehicle_usage_events;
CREATE POLICY "Users can view own vehicle usage" ON public.vehicle_usage_events
    FOR SELECT USING (
        vehicle_id IN (SELECT id FROM public.vehicles WHERE profile_id = (SELECT auth.uid()))
    );

-- vehicle_behavior_features
DROP POLICY IF EXISTS "Users can view own vehicle features" ON public.vehicle_behavior_features;
CREATE POLICY "Users can view own vehicle features" ON public.vehicle_behavior_features
    FOR SELECT USING (
        vehicle_id IN (SELECT id FROM public.vehicles WHERE profile_id = (SELECT auth.uid()))
    );

-- domain_events
DROP POLICY IF EXISTS "Users can view events of their profile" ON public.domain_events;
DROP POLICY IF EXISTS "Users can insert events for their profile" ON public.domain_events;

CREATE POLICY "Users can view events of their profile" ON public.domain_events
    FOR SELECT USING (profile_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert events for their profile" ON public.domain_events
    FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

-- event_context
DROP POLICY IF EXISTS "Users can view context of their events" ON public.event_context;
DROP POLICY IF EXISTS "Users can insert context for their events" ON public.event_context;

CREATE POLICY "Users can view context of their events" ON public.event_context
    FOR SELECT USING (
        event_id IN (SELECT id FROM public.domain_events WHERE profile_id = (SELECT auth.uid()))
    );
CREATE POLICY "Users can insert context for their events" ON public.event_context
    FOR INSERT WITH CHECK (
        event_id IN (SELECT id FROM public.domain_events WHERE profile_id = (SELECT auth.uid()))
    );

-- derived_metrics
DROP POLICY IF EXISTS "Users can view metrics of their profile" ON public.derived_metrics;
DROP POLICY IF EXISTS "Users can insert metrics for their profile" ON public.derived_metrics;

CREATE POLICY "Users can view metrics of their profile" ON public.derived_metrics
    FOR SELECT USING (profile_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert metrics for their profile" ON public.derived_metrics
    FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

-- operational_baselines (já removemos a duplicada, agora recriar a manage)
DROP POLICY IF EXISTS "Users can manage baselines for their profile" ON public.operational_baselines;
CREATE POLICY "Users can manage baselines for their profile" ON public.operational_baselines
    FOR ALL USING (profile_id = (SELECT auth.uid()));
