-- ============================================================================
-- Migration 113: Add soft delete support for teams
-- Problem:
--   1. teams table has no deleted_at column for soft delete
--   2. View shows all teams including soft-deleted ones
-- Solution:
--   1. Add deleted_at column to teams table
--   2. Update view to filter out deleted teams
-- ============================================================================

-- Add deleted_at column if it doesn't exist
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for deleted_at (partial index for active teams)
CREATE INDEX IF NOT EXISTS idx_teams_active ON public.teams(profile_id) WHERE deleted_at IS NULL;

-- Update the view to filter deleted teams
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
LEFT JOIN public.vehicles v ON v.id = t.vehicle_id
WHERE t.deleted_at IS NULL;  -- Filter out soft-deleted teams

-- CRITICAL: Enable security invoker so RLS policies are enforced
ALTER VIEW public.v_teams_summary SET (security_invoker = on);

COMMENT ON VIEW public.v_teams_summary IS
'View resumida das equipes ativas (não deletadas) com contagens de membros e equipamentos.';
