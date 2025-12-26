-- =====================================================
-- FIX: Remove ALL triggers from vehicle_costs that call fn_emit_domain_event
-- =====================================================
-- The function was removed but triggers still try to call it

-- Drop ALL triggers on vehicle_costs that might reference fn_emit_domain_event
DROP TRIGGER IF EXISTS trg_vehicle_costs_event ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_wiretap_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_event_policy_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trigger_event_vehicle_cost ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_emit_domain_event_vehicle_costs ON public.vehicle_costs;

-- Drop any other potential triggers
DO $$
DECLARE
    trig_record RECORD;
BEGIN
    FOR trig_record IN
        SELECT tgname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        WHERE pg_class.relname = 'vehicle_costs'
        AND pg_namespace.nspname = 'public'
        AND NOT tgisinternal
    LOOP
        RAISE NOTICE 'Found trigger % on vehicle_costs', trig_record.tgname;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.vehicle_costs', trig_record.tgname);
    END LOOP;
END $$;

-- Also remove any fn_emit_domain_event variants still remaining
DO $$
DECLARE
    func_record RECORD;
    drop_stmt TEXT;
BEGIN
    FOR func_record IN
        SELECT pg_catalog.pg_get_function_identity_arguments(pg_proc.oid) as args
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE proname = 'fn_emit_domain_event' 
        AND nspname = 'public'
    LOOP
        drop_stmt := 'DROP FUNCTION IF EXISTS public.fn_emit_domain_event(' || func_record.args || ') CASCADE';
        RAISE NOTICE 'Dropping: %', drop_stmt;
        EXECUTE drop_stmt;
    END LOOP;
END $$;

-- Now vehicle_costs will only receive inserts from sync_vehicle_expense_to_costs
-- which does NOT call fn_emit_domain_event in the first place

COMMENT ON TABLE public.vehicle_costs IS 
'Vehicle costs table. All triggers that called fn_emit_domain_event have been removed.
Costs are now synced from operium_events via sync_vehicle_expense_to_costs trigger.';
