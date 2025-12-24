-- Migration: 091_fix_critical_rls_policies.sql
-- Description: Corrige políticas RLS quebradas pela migration 088
-- Author: Security Audit
-- Date: 2024-12-23
--
-- CRITICAL: A migration 088 definiu USING(true) para teams e team_equipment,
-- permitindo que qualquer usuário autenticado acesse dados de qualquer organização.
-- Esta migration restaura o isolamento correto baseado em org_id.
-- ============================================================================

-- ============================================================================
-- 1. CORRIGIR TEAMS - Restaurar isolamento por org_id
-- ============================================================================

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "teams_authenticated_all" ON public.teams;
DROP POLICY IF EXISTS "teams_select" ON public.teams;
DROP POLICY IF EXISTS "teams_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_update" ON public.teams;
DROP POLICY IF EXISTS "teams_delete" ON public.teams;

-- Políticas corretas com isolamento por organização
CREATE POLICY "teams_select_org" ON public.teams
FOR SELECT USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())  -- fallback para equipes legacy sem org_id
);

CREATE POLICY "teams_insert_org" ON public.teams
FOR INSERT WITH CHECK (
    -- Garante que org_id será da organização do usuário
    COALESCE(org_id, (SELECT get_user_org_id())) = (SELECT get_user_org_id())
);

CREATE POLICY "teams_update_org" ON public.teams
FOR UPDATE USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
) WITH CHECK (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
);

CREATE POLICY "teams_delete_org" ON public.teams
FOR DELETE USING (
    -- Apenas admins podem deletar, e apenas da própria org
    is_operium_admin() AND org_id = (SELECT get_user_org_id())
);

-- ============================================================================
-- 2. CORRIGIR TEAM_EQUIPMENT - Restaurar isolamento via team -> org
-- ============================================================================

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "team_equipment_authenticated_all" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_select" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_insert" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_update" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_delete" ON public.team_equipment;

-- Políticas corretas com isolamento via team_id -> teams.org_id
CREATE POLICY "team_equipment_select_org" ON public.team_equipment
FOR SELECT USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_equipment_insert_org" ON public.team_equipment
FOR INSERT WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_equipment_update_org" ON public.team_equipment
FOR UPDATE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
) WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_equipment_delete_org" ON public.team_equipment
FOR DELETE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- 3. CORRIGIR FERRAMENTAS - Restaurar isolamento por profile_id
-- ============================================================================

-- Remover políticas problemáticas (caso existam da URGENT_FIX)
DROP POLICY IF EXISTS "ferramentas_authenticated_all" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_select" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_insert" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_update" ON public.ferramentas;
DROP POLICY IF EXISTS "ferramentas_delete" ON public.ferramentas;

-- Política consolidada correta para ferramentas
CREATE POLICY "ferramentas_owner_all" ON public.ferramentas
FOR ALL
TO authenticated
USING (profile_id = (SELECT auth.uid()))
WITH CHECK (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. ÍNDICES PARA PERFORMANCE DAS POLICIES
-- ============================================================================

-- Garantir índice em teams.org_id para performance das subqueries
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON public.teams(org_id);

-- Índice em team_equipment.team_id já deve existir, mas garantir
CREATE INDEX IF NOT EXISTS idx_team_equipment_team_id ON public.team_equipment(team_id);

-- ============================================================================
-- 5. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON POLICY "teams_select_org" ON public.teams IS
'Usuários podem ver equipes da sua organização (org_id) ou equipes que criaram (profile_id fallback)';

COMMENT ON POLICY "teams_insert_org" ON public.teams IS
'Usuários só podem criar equipes na sua própria organização';

COMMENT ON POLICY "teams_update_org" ON public.teams IS
'Usuários podem atualizar equipes da sua organização';

COMMENT ON POLICY "teams_delete_org" ON public.teams IS
'Apenas admins podem deletar equipes, e somente da própria organização';

COMMENT ON POLICY "team_equipment_select_org" ON public.team_equipment IS
'Usuários podem ver equipamentos de equipes da sua organização';

COMMENT ON POLICY "ferramentas_owner_all" ON public.ferramentas IS
'Usuários só podem gerenciar suas próprias ferramentas (profile_id = auth.uid)';

-- ============================================================================
-- 6. VERIFICAÇÃO (executar manualmente para confirmar)
-- ============================================================================

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('teams', 'team_equipment', 'ferramentas')
-- ORDER BY tablename, policyname;
