-- Migration: 078_fix_operium_rls_performance.sql
-- Description: Corrige warnings de performance do linter RLS
--
-- Problemas corrigidos:
-- 1. auth_rls_initplan: Usa (SELECT auth.uid()) para cachear valor
-- 2. multiple_permissive_policies: Remove policies duplicadas antigas

-- ============================================================================
-- 1. REMOVER POLICIES ANTIGAS DUPLICADAS
-- ============================================================================

-- operium_events
DROP POLICY IF EXISTS "Org owners can view their operium events" ON public.operium_events;
DROP POLICY IF EXISTS "Org owners can insert operium events" ON public.operium_events;

-- operium_profiles  
DROP POLICY IF EXISTS "operium_profiles_select_own_org" ON public.operium_profiles;
DROP POLICY IF EXISTS "operium_profiles_insert_admin" ON public.operium_profiles;
DROP POLICY IF EXISTS "operium_profiles_delete_admin" ON public.operium_profiles;
DROP POLICY IF EXISTS "Users can update own operium profile" ON public.operium_profiles;

-- operium_vehicles
DROP POLICY IF EXISTS "operium_vehicles_select_own_org" ON public.operium_vehicles;
DROP POLICY IF EXISTS "operium_vehicles_insert_admin" ON public.operium_vehicles;
DROP POLICY IF EXISTS "operium_vehicles_update_admin" ON public.operium_vehicles;
DROP POLICY IF EXISTS "operium_vehicles_delete_admin" ON public.operium_vehicles;

-- operium_inventory_items
DROP POLICY IF EXISTS "operium_inventory_select_own_org" ON public.operium_inventory_items;
DROP POLICY IF EXISTS "operium_inventory_insert_admin" ON public.operium_inventory_items;
DROP POLICY IF EXISTS "operium_inventory_update_admin_warehouse" ON public.operium_inventory_items;
DROP POLICY IF EXISTS "operium_inventory_delete_admin" ON public.operium_inventory_items;

-- ============================================================================
-- 2. RECRIAR POLICIES COM (SELECT ...) PARA PERFORMANCE
-- ============================================================================

-- Dropar policies da migration 077
DROP POLICY IF EXISTS "operium_events_select" ON public.operium_events;
DROP POLICY IF EXISTS "operium_events_insert" ON public.operium_events;
DROP POLICY IF EXISTS "operium_events_update" ON public.operium_events;
DROP POLICY IF EXISTS "operium_events_delete" ON public.operium_events;

DROP POLICY IF EXISTS "operium_profiles_select" ON public.operium_profiles;
DROP POLICY IF EXISTS "operium_profiles_insert" ON public.operium_profiles;
DROP POLICY IF EXISTS "operium_profiles_update" ON public.operium_profiles;
DROP POLICY IF EXISTS "operium_profiles_delete" ON public.operium_profiles;

DROP POLICY IF EXISTS "operium_vehicles_select" ON public.operium_vehicles;
DROP POLICY IF EXISTS "operium_vehicles_insert" ON public.operium_vehicles;
DROP POLICY IF EXISTS "operium_vehicles_update" ON public.operium_vehicles;
DROP POLICY IF EXISTS "operium_vehicles_delete" ON public.operium_vehicles;

DROP POLICY IF EXISTS "operium_inventory_items_select" ON public.operium_inventory_items;
DROP POLICY IF EXISTS "operium_inventory_items_insert" ON public.operium_inventory_items;
DROP POLICY IF EXISTS "operium_inventory_items_update" ON public.operium_inventory_items;
DROP POLICY IF EXISTS "operium_inventory_items_delete" ON public.operium_inventory_items;

-- ============================================================================
-- OPERIUM_EVENTS - com (SELECT ...) para cachear
-- ============================================================================

CREATE POLICY "operium_events_select" ON public.operium_events
FOR SELECT USING (
    -- Admin vê tudo da org
    (is_operium_admin() AND org_id = (SELECT get_user_org_id()))
    OR
    -- FIELD com equipe: vê eventos de colegas da mesma equipe
    (actor_user_id IN (SELECT get_team_member_ids()) AND (SELECT get_user_team_id()) IS NOT NULL)
    OR
    -- FIELD sem equipe: vê apenas seus próprios eventos
    (actor_user_id = (SELECT auth.uid()) AND (SELECT get_user_team_id()) IS NULL)
);

CREATE POLICY "operium_events_insert" ON public.operium_events
FOR INSERT WITH CHECK (
    org_id = (SELECT get_user_org_id())
);

CREATE POLICY "operium_events_update" ON public.operium_events
FOR UPDATE USING (is_operium_admin() AND org_id = (SELECT get_user_org_id()));

CREATE POLICY "operium_events_delete" ON public.operium_events
FOR DELETE USING (is_operium_admin() AND org_id = (SELECT get_user_org_id()));

-- ============================================================================
-- OPERIUM_PROFILES - com (SELECT ...) para cachear
-- ============================================================================

CREATE POLICY "operium_profiles_select" ON public.operium_profiles
FOR SELECT USING (
    org_id = (SELECT get_user_org_id()) OR user_id = (SELECT auth.uid())
);

CREATE POLICY "operium_profiles_insert" ON public.operium_profiles
FOR INSERT WITH CHECK (
    is_operium_admin() OR user_id = (SELECT auth.uid())
);

CREATE POLICY "operium_profiles_update" ON public.operium_profiles
FOR UPDATE USING (
    (is_operium_admin() AND org_id = (SELECT get_user_org_id()))
    OR user_id = (SELECT auth.uid())
);

CREATE POLICY "operium_profiles_delete" ON public.operium_profiles
FOR DELETE USING (is_operium_admin() AND org_id = (SELECT get_user_org_id()));

-- ============================================================================
-- OPERIUM_VEHICLES - com (SELECT ...) para cachear
-- ============================================================================

CREATE POLICY "operium_vehicles_select" ON public.operium_vehicles
FOR SELECT USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "operium_vehicles_insert" ON public.operium_vehicles
FOR INSERT WITH CHECK (org_id = (SELECT get_user_org_id()) AND is_operium_admin());

CREATE POLICY "operium_vehicles_update" ON public.operium_vehicles
FOR UPDATE USING (org_id = (SELECT get_user_org_id()) AND is_operium_admin());

CREATE POLICY "operium_vehicles_delete" ON public.operium_vehicles
FOR DELETE USING (org_id = (SELECT get_user_org_id()) AND is_operium_admin());

-- ============================================================================
-- OPERIUM_INVENTORY_ITEMS - com (SELECT ...) para cachear
-- ============================================================================

CREATE POLICY "operium_inventory_items_select" ON public.operium_inventory_items
FOR SELECT USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "operium_inventory_items_insert" ON public.operium_inventory_items
FOR INSERT WITH CHECK (org_id = (SELECT get_user_org_id()));

CREATE POLICY "operium_inventory_items_update" ON public.operium_inventory_items
FOR UPDATE USING (org_id = (SELECT get_user_org_id()));

CREATE POLICY "operium_inventory_items_delete" ON public.operium_inventory_items
FOR DELETE USING (org_id = (SELECT get_user_org_id()) AND is_operium_admin());
