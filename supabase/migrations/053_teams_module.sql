-- Migration: 053_teams_module.sql
-- Description: Módulo de Gestão de Equipes
-- Author: AI Assistant
-- Date: 2024-12-22
-- ============================================================================

-- ============================================================================
-- 1. TABELA PRINCIPAL: EQUIPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Líder e Veículo
    leader_id UUID REFERENCES public.colaboradores(id),
    vehicle_id UUID REFERENCES public.vehicles(id),
    
    -- Localização Atual
    current_location TEXT,
    current_project TEXT,
    current_service TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_break', 'off_duty')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_teams_profile ON public.teams(profile_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON public.teams(leader_id) WHERE leader_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_vehicle ON public.teams(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(profile_id, status);

-- RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own teams" ON public.teams
    FOR ALL USING (profile_id = (SELECT auth.uid()));

COMMENT ON TABLE public.teams IS 
'Equipes de trabalho que operam em campo.
Cada equipe pode ter um líder, um veículo atribuído, e equipamentos.';

-- ============================================================================
-- 2. TABELA: MEMBROS DA EQUIPE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    role TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    -- Evitar duplicatas (mesmo colaborador na mesma equipe)
    CONSTRAINT unique_active_team_member UNIQUE (team_id, colaborador_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_colaborador ON public.team_members(colaborador_id);

-- RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage team members via team" ON public.team_members
    FOR ALL USING (
        team_id IN (SELECT id FROM public.teams WHERE profile_id = (SELECT auth.uid()))
    );

COMMENT ON TABLE public.team_members IS 
'Membros de cada equipe. Um colaborador pode estar em apenas uma equipe ativa.';

-- ============================================================================
-- 3. TABELA: EQUIPAMENTOS DA EQUIPE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    ferramenta_id UUID NOT NULL REFERENCES public.ferramentas(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    notes TEXT,
    
    -- Referência à movimentação de saída
    movimentacao_saida_id UUID REFERENCES public.movimentacoes(id),
    movimentacao_devolucao_id UUID REFERENCES public.movimentacoes(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_team_equipment_team ON public.team_equipment(team_id);
CREATE INDEX IF NOT EXISTS idx_team_equipment_ferramenta ON public.team_equipment(ferramenta_id);
CREATE INDEX IF NOT EXISTS idx_team_equipment_active ON public.team_equipment(team_id) WHERE returned_at IS NULL;

-- RLS
ALTER TABLE public.team_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage team equipment via team" ON public.team_equipment
    FOR ALL USING (
        team_id IN (SELECT id FROM public.teams WHERE profile_id = (SELECT auth.uid()))
    );

COMMENT ON TABLE public.team_equipment IS 
'Equipamentos atribuídos a cada equipe. returned_at NULL significa que ainda está com a equipe.';

-- ============================================================================
-- 4. TABELA: HISTÓRICO DE OBRAS/SERVIÇOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    location TEXT,
    service_type TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_team_assignments_team ON public.team_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_active ON public.team_assignments(team_id) WHERE ended_at IS NULL;

-- RLS
ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage team assignments via team" ON public.team_assignments
    FOR ALL USING (
        team_id IN (SELECT id FROM public.teams WHERE profile_id = (SELECT auth.uid()))
    );

COMMENT ON TABLE public.team_assignments IS 
'Histórico de obras/serviços realizados por cada equipe.';

-- ============================================================================
-- 5. TRIGGER: ATUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_teams_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_teams_timestamp();

-- ============================================================================
-- 6. VIEW: RESUMO DAS EQUIPES
-- ============================================================================

CREATE OR REPLACE VIEW public.v_teams_summary AS
SELECT 
    t.id,
    t.profile_id,
    t.name,
    t.description,
    t.status,
    t.current_location,
    t.current_project,
    t.current_service,
    t.created_at,
    -- Líder
    t.leader_id,
    c.nome AS leader_name,
    c.foto_url AS leader_photo,
    -- Veículo
    t.vehicle_id,
    v.plate AS vehicle_plate,
    v.model AS vehicle_model,
    -- Contagens
    (SELECT COUNT(*) FROM public.team_members tm WHERE tm.team_id = t.id AND tm.left_at IS NULL) AS member_count,
    (SELECT COUNT(*) FROM public.team_equipment te WHERE te.team_id = t.id AND te.returned_at IS NULL) AS equipment_count,
    (SELECT SUM(te.quantity) FROM public.team_equipment te WHERE te.team_id = t.id AND te.returned_at IS NULL) AS equipment_quantity
FROM public.teams t
LEFT JOIN public.colaboradores c ON c.id = t.leader_id
LEFT JOIN public.vehicles v ON v.id = t.vehicle_id;

ALTER VIEW public.v_teams_summary SET (security_invoker = on);

COMMENT ON VIEW public.v_teams_summary IS 
'View resumida das equipes com contagens de membros e equipamentos.';

-- ============================================================================
-- 7. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_equipment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_assignments TO authenticated;
GRANT SELECT ON public.v_teams_summary TO authenticated;
