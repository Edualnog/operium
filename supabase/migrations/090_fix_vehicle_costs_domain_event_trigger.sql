-- Migration: 090_fix_vehicle_costs_domain_event_trigger.sql
-- Description: Remove broken trigger that references non-existent profile_id column
-- Author: AI Assistant
-- Date: 2024-12-23
-- 
-- Bug: fn_emit_domain_event tries to access NEW.profile_id but vehicle_costs has no such column
-- Fix: Drop the broken trigger. Domain events for vehicle costs are already handled by
--      trigger_event_vehicle_cost which correctly gets profile_id from vehicles table.
-- ============================================================================

-- Drop the broken trigger
DROP TRIGGER IF EXISTS trg_vehicle_costs_event ON public.vehicle_costs;

-- Comment explaining why
COMMENT ON TABLE public.vehicle_costs IS 
'Vehicle costs table. Note: trg_vehicle_costs_event was removed because it tried to access ' ||
'non-existent profile_id column. Domain events are handled by trg_event_vehicle_cost instead.';
