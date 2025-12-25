-- ============================================================================
-- Migration 108: Disable broken event triggers
-- Problem: fn_generic_event_trigger uses pg_exception_context() which doesn't exist in Supabase
-- Solution: Disable the triggers until the function is fixed
-- ============================================================================

-- Disable the trigger on ferramentas (most critical for product creation)
DROP TRIGGER IF EXISTS trg_enforce_event_ferramentas ON public.ferramentas;

-- Disable other triggers that use the same broken function
DROP TRIGGER IF EXISTS trg_enforce_event_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_enforce_event_consertos ON public.consertos;
DROP TRIGGER IF EXISTS trg_enforce_event_inventarios ON public.inventarios;
DROP TRIGGER IF EXISTS trg_enforce_event_inventario_itens ON public.inventario_itens;
DROP TRIGGER IF EXISTS trg_enforce_event_inventario_ajustes ON public.inventario_ajustes;
DROP TRIGGER IF EXISTS trg_enforce_event_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_enforce_event_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_enforce_event_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_enforce_event_team_assignments ON public.team_assignments;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_maintenances ON public.vehicle_maintenances;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_usage_events ON public.vehicle_usage_events;
DROP TRIGGER IF EXISTS trg_enforce_event_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_enforce_event_equipment_issues ON public.equipment_issues;
DROP TRIGGER IF EXISTS trg_enforce_event_equipment_notifications ON public.equipment_notifications;
DROP TRIGGER IF EXISTS trg_enforce_event_assets ON public.assets;

-- Also drop the auto event context trigger which has the same issue
DROP TRIGGER IF EXISTS trg_auto_event_context ON public.domain_events;

-- Log that triggers were disabled
DO $$
BEGIN
    RAISE NOTICE 'Event enforcement triggers have been disabled due to pg_exception_context() incompatibility with Supabase';
END;
$$;
