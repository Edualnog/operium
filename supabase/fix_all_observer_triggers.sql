-- =====================================================
-- COMPREHENSIVE FIX: Remove ALL observer triggers and fn_emit_domain_event
-- This script removes all observability infrastructure that is causing errors
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Remove ALL triggers that might call fn_emit_domain_event
-- on ALL tables

-- vehicle_costs
DROP TRIGGER IF EXISTS trg_vehicle_costs_event ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_wiretap_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_event_policy_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trigger_event_vehicle_cost ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_emit_domain_event_vehicle_costs ON public.vehicle_costs;
DROP TRIGGER IF EXISTS trg_auto_emit_domain_event ON public.vehicle_costs;

-- operium_events (but KEEP trigger_sync_vehicle_expense if needed)
DROP TRIGGER IF EXISTS trg_wiretap_operium_events ON public.operium_events;
DROP TRIGGER IF EXISTS trg_emit_domain_event_operium_events ON public.operium_events;

-- domain_events
DROP TRIGGER IF EXISTS trg_auto_event_context ON public.domain_events;

-- colaboradores
DROP TRIGGER IF EXISTS trg_wiretap_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_emit_domain_event_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_enforce_event_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_event_policy_colaboradores ON public.colaboradores;

-- ferramentas
DROP TRIGGER IF EXISTS trg_wiretap_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_emit_domain_event_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_enforce_event_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_event_policy_ferramentas ON public.ferramentas;

-- movimentacoes
DROP TRIGGER IF EXISTS trg_wiretap_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_emit_domain_event_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_enforce_event_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_event_policy_movimentacoes ON public.movimentacoes;

-- consertos
DROP TRIGGER IF EXISTS trg_wiretap_consertos ON public.consertos;
DROP TRIGGER IF EXISTS trg_emit_domain_event_consertos ON public.consertos;
DROP TRIGGER IF EXISTS trg_enforce_event_consertos ON public.consertos;
DROP TRIGGER IF EXISTS trg_event_policy_consertos ON public.consertos;

-- vehicles
DROP TRIGGER IF EXISTS trg_wiretap_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_emit_domain_event_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_event_policy_vehicles ON public.vehicles;

-- vehicle_maintenances
DROP TRIGGER IF EXISTS trg_wiretap_vehicle_maintenances ON public.vehicle_maintenances;
DROP TRIGGER IF EXISTS trg_emit_domain_event_vehicle_maintenances ON public.vehicle_maintenances;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_maintenances ON public.vehicle_maintenances;
DROP TRIGGER IF EXISTS trg_event_policy_vehicle_maintenances ON public.vehicle_maintenances;

-- vehicle_usage_events
DROP TRIGGER IF EXISTS trg_wiretap_vehicle_usage_events ON public.vehicle_usage_events;
DROP TRIGGER IF EXISTS trg_emit_domain_event_vehicle_usage_events ON public.vehicle_usage_events;
DROP TRIGGER IF EXISTS trg_enforce_event_vehicle_usage_events ON public.vehicle_usage_events;
DROP TRIGGER IF EXISTS trg_event_policy_vehicle_usage_events ON public.vehicle_usage_events;

-- teams
DROP TRIGGER IF EXISTS trg_wiretap_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_emit_domain_event_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_enforce_event_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_event_policy_teams ON public.teams;

-- team_equipment
DROP TRIGGER IF EXISTS trg_wiretap_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_emit_domain_event_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_enforce_event_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_event_policy_team_equipment ON public.team_equipment;

-- team_members
DROP TRIGGER IF EXISTS trg_wiretap_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_emit_domain_event_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_enforce_event_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_event_policy_team_members ON public.team_members;

-- team_assignments
DROP TRIGGER IF EXISTS trg_wiretap_team_assignments ON public.team_assignments;
DROP TRIGGER IF EXISTS trg_emit_domain_event_team_assignments ON public.team_assignments;
DROP TRIGGER IF EXISTS trg_enforce_event_team_assignments ON public.team_assignments;
DROP TRIGGER IF EXISTS trg_event_policy_team_assignments ON public.team_assignments;

-- inventarios
DROP TRIGGER IF EXISTS trg_wiretap_inventarios ON public.inventarios;
DROP TRIGGER IF EXISTS trg_emit_domain_event_inventarios ON public.inventarios;

-- inventario_itens
DROP TRIGGER IF EXISTS trg_wiretap_inventario_itens ON public.inventario_itens;
DROP TRIGGER IF EXISTS trg_emit_domain_event_inventario_itens ON public.inventario_itens;

-- STEP 2: Dynamic cleanup - find and drop ALL remaining problematic triggers
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN
        SELECT 
            tgname as trigger_name,
            relname as table_name,
            nspname as schema_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE NOT t.tgisinternal
        AND n.nspname = 'public'
        AND (
            tgname LIKE '%emit_domain_event%'
            OR tgname LIKE '%wiretap%'
            OR tgname LIKE '%enforce_event%'
            OR tgname LIKE '%event_policy%'
        )
    LOOP
        RAISE NOTICE 'Dropping trigger: %.% on %', trigger_rec.schema_name, trigger_rec.trigger_name, trigger_rec.table_name;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', 
            trigger_rec.trigger_name, 
            trigger_rec.schema_name, 
            trigger_rec.table_name);
    END LOOP;
END $$;

-- STEP 3: Drop ALL versions of fn_emit_domain_event function
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    FOR func_rec IN
        SELECT 
            n.nspname as schema_name,
            p.proname as func_name,
            pg_catalog.pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'fn_emit_domain_event'
    LOOP
        RAISE NOTICE 'Dropping function: %.%(%)', func_rec.schema_name, func_rec.func_name, func_rec.args;
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
            func_rec.schema_name, 
            func_rec.func_name, 
            func_rec.args);
    END LOOP;
END $$;

-- STEP 4: Also drop related trigger functions that might reference fn_emit_domain_event
DROP FUNCTION IF EXISTS public.fn_wiretap_event() CASCADE;
DROP FUNCTION IF EXISTS public.fn_enforce_event_on_table() CASCADE;
DROP FUNCTION IF EXISTS public.fn_auto_event_context() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_emit_domain_event() CASCADE;

-- STEP 5: Drop any remaining event policy-related functions
DROP FUNCTION IF EXISTS public.fn_apply_event_policy() CASCADE;
DROP FUNCTION IF EXISTS public.fn_check_event_policy() CASCADE;

-- Verify cleanup
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'fn_emit_domain_event';
    
    IF remaining_count > 0 THEN
        RAISE WARNING 'Still found % fn_emit_domain_event functions remaining!', remaining_count;
    ELSE
        RAISE NOTICE 'Success! All fn_emit_domain_event functions have been removed.';
    END IF;
END $$;

-- Final message
DO $$ BEGIN RAISE NOTICE 'Observer infrastructure cleanup complete. Vehicle expenses should work now.'; END $$;
