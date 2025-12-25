-- ============================================================================
-- Migration 108: Disable ALL broken event triggers
-- Problems:
--   1. fn_generic_event_trigger uses pg_exception_context() which doesn't exist in Supabase
--   2. Functions have search_path = '' causing "relation does not exist" errors
--   3. Some triggers try to access NEW.org_id on tables that don't have that column
-- Solution: Remove all event/audit triggers until properly rewritten
-- ============================================================================

-- FERRAMENTAS
DROP TRIGGER IF EXISTS trg_enforce_event_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS ferramentas_broadcast_trigger ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_capture_ferramenta_failure ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_event_policy_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_wiretap_ferramentas ON public.ferramentas;

-- MOVIMENTACOES
DROP TRIGGER IF EXISTS trg_enforce_event_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS movimentacoes_broadcast_trigger ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_capture_movimentacao_failure ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_event_policy_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_wiretap_movimentacoes ON public.movimentacoes;

-- CONSERTOS
DROP TRIGGER IF EXISTS trg_enforce_event_consertos ON public.consertos;
DROP TRIGGER IF EXISTS consertos_broadcast_trigger ON public.consertos;
DROP TRIGGER IF EXISTS trg_capture_conserto_failure ON public.consertos;
DROP TRIGGER IF EXISTS trg_event_policy_consertos ON public.consertos;
DROP TRIGGER IF EXISTS trg_wiretap_consertos ON public.consertos;

-- COLABORADORES
DROP TRIGGER IF EXISTS trg_enforce_event_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS colaboradores_broadcast_trigger ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_capture_colaborador_failure ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_event_policy_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_wiretap_colaboradores ON public.colaboradores;

-- TEAMS
DROP TRIGGER IF EXISTS trg_enforce_event_teams ON public.teams;
DROP TRIGGER IF EXISTS teams_broadcast_trigger ON public.teams;
DROP TRIGGER IF EXISTS trg_capture_team_failure ON public.teams;
DROP TRIGGER IF EXISTS trg_event_policy_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_wiretap_teams ON public.teams;

-- TEAM_MEMBERS
DROP TRIGGER IF EXISTS trg_enforce_event_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_event_policy_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_wiretap_team_members ON public.team_members;

-- TEAM_EQUIPMENT
DROP TRIGGER IF EXISTS trg_enforce_event_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_event_policy_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_wiretap_team_equipment ON public.team_equipment;

-- TEAM_ASSIGNMENTS
DROP TRIGGER IF EXISTS trg_enforce_event_team_assignments ON public.team_assignments;
DROP TRIGGER IF EXISTS trg_event_policy_team_assignments ON public.team_assignments;
DROP TRIGGER IF EXISTS trg_wiretap_team_assignments ON public.team_assignments;

-- VEHICLES
DROP TRIGGER IF EXISTS trg_enforce_event_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS vehicles_broadcast_trigger ON public.vehicles;
DROP TRIGGER IF EXISTS trg_event_policy_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_wiretap_vehicles ON public.vehicles;

-- VEHICLE_MAINTENANCES
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_maintenances ON public.vehicle_maintenances;
DROP TRIGGER IF EXISTS trg_event_policy_vehicle_maintenances ON public.vehicle_maintenances;
DROP TRIGGER IF EXISTS trg_wiretap_vehicle_maintenances ON public.vehicle_maintenances;

-- VEHICLE_COSTS
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_event_policy_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_wiretap_vehicle_costs ON public.vehicle_costs;

-- VEHICLE_USAGE_EVENTS
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_usage_events ON public.vehicle_usage_events;
DROP TRIGGER IF EXISTS trg_event_policy_vehicle_usage_events ON public.vehicle_usage_events;
DROP TRIGGER IF EXISTS trg_wiretap_vehicle_usage_events ON public.vehicle_usage_events;

-- INVENTARIOS
DROP TRIGGER IF EXISTS trg_enforce_event_inventarios ON public.inventarios;
DROP TRIGGER IF EXISTS trg_event_policy_inventarios ON public.inventarios;
DROP TRIGGER IF EXISTS trg_wiretap_inventarios ON public.inventarios;

-- INVENTARIO_ITENS
DROP TRIGGER IF EXISTS trg_enforce_event_inventario_itens ON public.inventario_itens;
DROP TRIGGER IF EXISTS trg_event_policy_inventario_itens ON public.inventario_itens;
DROP TRIGGER IF EXISTS trg_wiretap_inventario_itens ON public.inventario_itens;

-- INVENTARIO_AJUSTES
DROP TRIGGER IF EXISTS trg_enforce_event_inventario_ajustes ON public.inventario_ajustes;
DROP TRIGGER IF EXISTS trg_event_policy_inventario_ajustes ON public.inventario_ajustes;
DROP TRIGGER IF EXISTS trg_wiretap_inventario_ajustes ON public.inventario_ajustes;

-- EQUIPMENT_ISSUES
DROP TRIGGER IF EXISTS trg_enforce_event_equipment_issues ON public.equipment_issues;
DROP TRIGGER IF EXISTS trg_event_policy_equipment_issues ON public.equipment_issues;
DROP TRIGGER IF EXISTS trg_wiretap_equipment_issues ON public.equipment_issues;

-- EQUIPMENT_NOTIFICATIONS
DROP TRIGGER IF EXISTS trg_enforce_event_equipment_notifications ON public.equipment_notifications;
DROP TRIGGER IF EXISTS trg_event_policy_equipment_notifications ON public.equipment_notifications;
DROP TRIGGER IF EXISTS trg_wiretap_equipment_notifications ON public.equipment_notifications;

-- ASSETS
DROP TRIGGER IF EXISTS trg_enforce_event_assets ON public.assets;
DROP TRIGGER IF EXISTS trg_event_policy_assets ON public.assets;
DROP TRIGGER IF EXISTS trg_wiretap_assets ON public.assets;

-- DOMAIN_EVENTS
DROP TRIGGER IF EXISTS trg_auto_event_context ON public.domain_events;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'All problematic event triggers have been removed. The app will function normally without event logging.';
END;
$$;
