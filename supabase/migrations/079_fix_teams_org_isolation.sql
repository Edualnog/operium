-- Migration: 079_fix_teams_org_isolation.sql
-- Description: Corrige isolamento de equipes para modelo organizacional do Operium
--
-- Problema: As RLS policies das tabelas teams, team_members, team_equipment usavam
-- profile_id = auth.uid(), o que só permite acesso ao criador original da equipe.
-- Em um contexto multi-usuário organizacional, todos os admins da org devem poder
-- gerenciar equipes.
--
-- Solução: Adicionar org_id às tabelas e usar get_user_org_id() nas policies.

-- ============================================================================
-- 1. ADICIONAR org_id À TABELA TEAMS
-- ============================================================================

-- Adicionar coluna org_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'teams'
        AND column_name = 'org_id'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN org_id UUID;
    END IF;
END $$;

-- Atualizar equipes existentes com org_id do criador
UPDATE public.teams t
SET org_id = (
    SELECT op.org_id
    FROM public.operium_profiles op
    WHERE op.user_id = t.profile_id
    LIMIT 1
)
WHERE t.org_id IS NULL;

-- Criar índice para org_id
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON public.teams(org_id);

-- ============================================================================
-- 2. ATUALIZAR RLS POLICIES - TEAMS
-- ============================================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can select own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can insert own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can update own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can manage own teams" ON public.teams;

-- Novas políticas baseadas em org_id
CREATE POLICY "teams_select_org" ON public.teams
FOR SELECT USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())  -- fallback para equipes sem org_id
);

CREATE POLICY "teams_insert_org" ON public.teams
FOR INSERT WITH CHECK (
    -- Definir org_id automaticamente se não fornecido
    COALESCE(org_id, (SELECT get_user_org_id())) = (SELECT get_user_org_id())
);

CREATE POLICY "teams_update_org" ON public.teams
FOR UPDATE USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
);

CREATE POLICY "teams_delete_org" ON public.teams
FOR DELETE USING (
    is_operium_admin() AND org_id = (SELECT get_user_org_id())
);

-- ============================================================================
-- 3. ATUALIZAR RLS POLICIES - TEAM_MEMBERS
-- ============================================================================

DROP POLICY IF EXISTS "Users can select team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage team members via team" ON public.team_members;

CREATE POLICY "team_members_select_org" ON public.team_members
FOR SELECT USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_members_insert_org" ON public.team_members
FOR INSERT WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_members_update_org" ON public.team_members
FOR UPDATE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_members_delete_org" ON public.team_members
FOR DELETE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- 4. ATUALIZAR RLS POLICIES - TEAM_EQUIPMENT
-- ============================================================================

DROP POLICY IF EXISTS "Users can select team equipment" ON public.team_equipment;
DROP POLICY IF EXISTS "Users can insert team equipment" ON public.team_equipment;
DROP POLICY IF EXISTS "Users can update team equipment" ON public.team_equipment;
DROP POLICY IF EXISTS "Users can delete team equipment" ON public.team_equipment;
DROP POLICY IF EXISTS "Users can manage team equipment via team" ON public.team_equipment;

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
-- 5. ATUALIZAR RLS POLICIES - TEAM_ASSIGNMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can select team assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Users can insert team assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Users can update team assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Users can delete team assignments" ON public.team_assignments;
DROP POLICY IF EXISTS "Users can manage team assignments via team" ON public.team_assignments;

CREATE POLICY "team_assignments_select_org" ON public.team_assignments
FOR SELECT USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_assignments_insert_org" ON public.team_assignments
FOR INSERT WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_assignments_update_org" ON public.team_assignments
FOR UPDATE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_assignments_delete_org" ON public.team_assignments
FOR DELETE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- 6. TRIGGER PARA AUTO-PREENCHER org_id AO CRIAR EQUIPE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_teams_auto_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Auto-preencher org_id se não foi fornecido
    IF NEW.org_id IS NULL THEN
        NEW.org_id := get_user_org_id();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_auto_org_id ON public.teams;
CREATE TRIGGER trg_teams_auto_org_id
    BEFORE INSERT ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_teams_auto_org_id();

-- ============================================================================
-- 7. COMENTÁRIOS
-- ============================================================================

COMMENT ON COLUMN public.teams.org_id IS 'ID da organização Operium. Usado para isolamento multi-tenant.';
COMMENT ON FUNCTION public.fn_teams_auto_org_id() IS 'Auto-preenche org_id ao criar nova equipe baseado no perfil Operium do usuário.';
