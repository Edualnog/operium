-- =====================================================
-- FIX: Drop trg_operium_events_domain trigger
-- This trigger was calling fn_emit_domain_event which was removed
-- =====================================================

DROP TRIGGER IF EXISTS trg_operium_events_domain ON public.operium_events;
DROP FUNCTION IF EXISTS public.fn_operium_events_to_domain() CASCADE;

-- Also ensure fn_emit_domain_event is removed
DO $$
DECLARE func_rec RECORD;
BEGIN
    FOR func_rec IN
        SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'fn_emit_domain_event' AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.fn_emit_domain_event(' || func_rec.args || ') CASCADE';
    END LOOP;
END $$;

COMMENT ON TABLE public.operium_events IS 
'Operational events table. Note: trg_operium_events_domain was removed because it called 
fn_emit_domain_event which was deprecated. Events are still synced to vehicle_costs via 
trigger_sync_vehicle_expense.';
