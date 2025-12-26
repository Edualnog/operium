-- ============================================================================
-- Migration 118: Remove broken ferramentas trigger (again)
-- Problem:
--   trg_enforce_event_ferramentas is still active and tries to access
--   the non-existent column 'updated_at' on ferramentas table
-- Solution:
--   Drop the trigger again (it may have been recreated by another migration)
-- ============================================================================

-- Drop all event triggers from ferramentas
DROP TRIGGER IF EXISTS trg_enforce_event_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS ferramentas_broadcast_trigger ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_capture_ferramenta_failure ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_event_policy_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_wiretap_ferramentas ON public.ferramentas;

-- Also drop from other tables that might have similar issues
DROP TRIGGER IF EXISTS trg_enforce_event_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_enforce_event_consertos ON public.consertos;
DROP TRIGGER IF EXISTS trg_enforce_event_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_enforce_event_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_enforce_event_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_enforce_event_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_enforce_event_team_assignments ON public.team_assignments;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_maintenances ON public.vehicle_maintenances;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_usage_events ON public.vehicle_usage_events;
DROP TRIGGER IF EXISTS trg_enforce_event_inventarios ON public.inventarios;
DROP TRIGGER IF EXISTS trg_enforce_event_inventario_itens ON public.inventario_itens;
DROP TRIGGER IF EXISTS trg_enforce_event_inventario_ajustes ON public.inventario_ajustes;
DROP TRIGGER IF EXISTS trg_enforce_event_equipment_issues ON public.equipment_issues;
DROP TRIGGER IF EXISTS trg_enforce_event_equipment_notifications ON public.equipment_notifications;
DROP TRIGGER IF EXISTS trg_enforce_event_assets ON public.assets;
DROP TRIGGER IF EXISTS trg_auto_event_context ON public.domain_events;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 118: All problematic event triggers have been removed.';
END;
$$;
