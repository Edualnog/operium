-- ============================================================================
-- Migration 127: Add total costs to teams summary view
-- Adiciona o total de custos (vehicle_costs) ao resumo das equipes
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
    (SELECT SUM(te.quantity) FROM public.team_equipment te WHERE te.team_id = t.id AND te.returned_at IS NULL) AS equipment_quantity,
    -- Total de Custos (vehicle_costs associados à equipe)
    (SELECT COALESCE(SUM(vc.amount), 0) FROM public.vehicle_costs vc WHERE vc.team_id = t.id) AS total_costs
FROM public.teams t
LEFT JOIN public.colaboradores c ON c.id = t.leader_id
LEFT JOIN public.vehicles v ON v.id = t.vehicle_id
WHERE t.deleted_at IS NULL;

-- CRITICAL: Enable security invoker so RLS policies are enforced
ALTER VIEW public.v_teams_summary SET (security_invoker = on);

COMMENT ON VIEW public.v_teams_summary IS
'View resumida das equipes ativas com contagens de membros, equipamentos e total de custos.';
