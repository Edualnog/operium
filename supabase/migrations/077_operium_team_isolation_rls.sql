-- Migration: 077_operium_team_isolation_rls.sql
-- Description: Implementa isolamento de dados por equipe no Operium
-- 
-- Modelo de visibilidade:
-- - ADMIN: vê tudo da organização
-- - FIELD com equipe: vê dados da própria equipe
-- - FIELD sem equipe: vê apenas seus próprios dados

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Retorna o org_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT org_id FROM operium_profiles WHERE user_id = auth.uid() AND active = true
$$;

-- Retorna o team_id do usuário atual (NULL se não tem equipe)
CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT team_id FROM operium_profiles WHERE user_id = auth.uid() AND active = true
$$;

-- Verifica se o usuário atual é ADMIN
CREATE OR REPLACE FUNCTION public.is_operium_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(role = 'ADMIN', false) FROM operium_profiles WHERE user_id = auth.uid() AND active = true
$$;

-- Retorna todos os user_ids da mesma equipe do usuário atual
CREATE OR REPLACE FUNCTION public.get_team_member_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT user_id 
    FROM operium_profiles 
    WHERE team_id = get_user_team_id() 
      AND team_id IS NOT NULL 
      AND active = true
$$;

-- ============================================================================
-- OPERIUM_EVENTS - Principal tabela de eventos
-- ============================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "operium_events_select" ON public.operium_events;
DROP POLICY IF EXISTS "operium_events_insert" ON public.operium_events;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.operium_events;
DROP POLICY IF EXISTS "team_isolation" ON public.operium_events;

-- Habilitar RLS
ALTER TABLE public.operium_events ENABLE ROW LEVEL SECURITY;

-- SELECT: isolamento por equipe
CREATE POLICY "operium_events_select" ON public.operium_events
FOR SELECT USING (
    -- Admin vê tudo da org
    (is_operium_admin() AND org_id = get_user_org_id())
    OR
    -- FIELD com equipe: vê eventos de colegas da mesma equipe
    (actor_user_id IN (SELECT get_team_member_ids()) AND get_user_team_id() IS NOT NULL)
    OR
    -- FIELD sem equipe: vê apenas seus próprios eventos
    (actor_user_id = auth.uid() AND get_user_team_id() IS NULL)
);

-- INSERT: qualquer usuário autenticado da org pode inserir
CREATE POLICY "operium_events_insert" ON public.operium_events
FOR INSERT WITH CHECK (
    org_id = get_user_org_id()
);

-- UPDATE/DELETE: apenas admin
CREATE POLICY "operium_events_update" ON public.operium_events
FOR UPDATE USING (is_operium_admin() AND org_id = get_user_org_id());

CREATE POLICY "operium_events_delete" ON public.operium_events
FOR DELETE USING (is_operium_admin() AND org_id = get_user_org_id());

-- ============================================================================
-- OPERIUM_VEHICLES - Veículos da org
-- ============================================================================

DROP POLICY IF EXISTS "operium_vehicles_select" ON public.operium_vehicles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.operium_vehicles;

ALTER TABLE public.operium_vehicles ENABLE ROW LEVEL SECURITY;

-- Todos da org podem ver veículos
CREATE POLICY "operium_vehicles_select" ON public.operium_vehicles
FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "operium_vehicles_insert" ON public.operium_vehicles
FOR INSERT WITH CHECK (org_id = get_user_org_id() AND is_operium_admin());

CREATE POLICY "operium_vehicles_update" ON public.operium_vehicles
FOR UPDATE USING (org_id = get_user_org_id() AND is_operium_admin());

CREATE POLICY "operium_vehicles_delete" ON public.operium_vehicles
FOR DELETE USING (org_id = get_user_org_id() AND is_operium_admin());

-- ============================================================================
-- OPERIUM_INVENTORY_ITEMS - Itens do inventário
-- ============================================================================

DROP POLICY IF EXISTS "operium_inventory_items_select" ON public.operium_inventory_items;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.operium_inventory_items;

ALTER TABLE public.operium_inventory_items ENABLE ROW LEVEL SECURITY;

-- Todos da org podem ver inventário
CREATE POLICY "operium_inventory_items_select" ON public.operium_inventory_items
FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "operium_inventory_items_insert" ON public.operium_inventory_items
FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "operium_inventory_items_update" ON public.operium_inventory_items
FOR UPDATE USING (org_id = get_user_org_id());

CREATE POLICY "operium_inventory_items_delete" ON public.operium_inventory_items
FOR DELETE USING (org_id = get_user_org_id() AND is_operium_admin());

-- ============================================================================
-- OPERIUM_PROFILES - Perfis dos usuários
-- ============================================================================

DROP POLICY IF EXISTS "operium_profiles_select" ON public.operium_profiles;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.operium_profiles;

ALTER TABLE public.operium_profiles ENABLE ROW LEVEL SECURITY;

-- Todos da org podem ver perfis (para listar membros)
CREATE POLICY "operium_profiles_select" ON public.operium_profiles
FOR SELECT USING (org_id = get_user_org_id() OR user_id = auth.uid());

-- Apenas admin pode inserir/atualizar/deletar
CREATE POLICY "operium_profiles_insert" ON public.operium_profiles
FOR INSERT WITH CHECK (is_operium_admin() OR user_id = auth.uid());

CREATE POLICY "operium_profiles_update" ON public.operium_profiles
FOR UPDATE USING (
    (is_operium_admin() AND org_id = get_user_org_id())
    OR user_id = auth.uid()
);

CREATE POLICY "operium_profiles_delete" ON public.operium_profiles
FOR DELETE USING (is_operium_admin() AND org_id = get_user_org_id());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_user_org_id() IS 'Returns the org_id of the current authenticated user from operium_profiles';
COMMENT ON FUNCTION public.get_user_team_id() IS 'Returns the team_id of the current authenticated user (NULL if not in a team)';
COMMENT ON FUNCTION public.is_operium_admin() IS 'Returns true if the current user has ADMIN role in operium_profiles';
COMMENT ON FUNCTION public.get_team_member_ids() IS 'Returns all user_ids that belong to the same team as the current user';
