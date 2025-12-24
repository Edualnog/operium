-- Migration: 089_fix_vehicle_costs_sync_trigger.sql
-- Description: Fix the sync_vehicle_expense_to_costs function to use correct column names
-- Author: AI Assistant
-- Date: 2024-12-23
-- 
-- Bug: Function was using wrong column names and structure
-- Fix: Restore correct version from migration 070
-- ============================================================================

-- Drop and recreate the function with correct structure
CREATE OR REPLACE FUNCTION public.sync_vehicle_expense_to_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tipo TEXT;
    v_valor NUMERIC;
    v_observacoes TEXT;
    v_foto_nf TEXT;
    v_reference_month DATE;
    v_team_id UUID;
BEGIN
    -- Only process VEHICLE_EXPENSE events  
    IF NEW.type != 'VEHICLE_EXPENSE' THEN
        RETURN NEW;
    END IF;

    -- Extract metadata
    v_tipo := (NEW.metadata->>'tipo')::TEXT;
    v_valor := (NEW.metadata->>'valor')::NUMERIC;
    v_observacoes := (NEW.metadata->>'observacoes')::TEXT;
    v_foto_nf := (NEW.metadata->>'foto_nf')::TEXT;

    -- Use the first day of the month from event creation date
    v_reference_month := DATE_TRUNC('month', NEW.created_at)::DATE;

    -- Get team_id from the user who created the event
    SELECT team_id INTO v_team_id
    FROM operium_profiles
    WHERE user_id = NEW.actor_user_id
    AND active = true
    LIMIT 1;

    -- Insert into vehicle_costs
    INSERT INTO vehicle_costs (
        vehicle_id,
        reference_month,
        cost_type,
        amount,
        notes,
        receipt_url,
        team_id,
        collaborator_id,
        created_at
    ) VALUES (
        NEW.target_id,        -- vehicle_id is stored in target_id
        v_reference_month,
        v_tipo,
        v_valor,
        v_observacoes,
        v_foto_nf,
        v_team_id,            -- team from operium_profiles
        NEW.actor_user_id,    -- collaborator who registered the expense
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_sync_vehicle_expense ON operium_events;
CREATE TRIGGER trigger_sync_vehicle_expense
    AFTER INSERT ON operium_events
    FOR EACH ROW
    EXECUTE FUNCTION sync_vehicle_expense_to_costs();

-- Comment
COMMENT ON FUNCTION public.sync_vehicle_expense_to_costs IS 
'Syncs VEHICLE_EXPENSE events to vehicle_costs table. Fixed to use correct column names: notes, reference_month.';

