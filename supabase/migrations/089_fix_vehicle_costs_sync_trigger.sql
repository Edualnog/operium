-- Migration: 089_fix_vehicle_costs_sync_trigger.sql
-- Description: Fix the sync_vehicle_expense_to_costs function to use correct column names
-- Author: AI Assistant
-- Date: 2024-12-23
-- 
-- Bug: Function was using 'description' and 'date' which don't exist in vehicle_costs
-- Fix: Use 'notes' and 'reference_month' which are the actual columns
-- ============================================================================

-- Drop and recreate the function with correct column names
CREATE OR REPLACE FUNCTION public.sync_vehicle_expense_to_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Sync vehicle expense event to vehicle_costs table
    IF NEW.type = 'VEHICLE_EXPENSE' THEN
        INSERT INTO vehicle_costs (
            vehicle_id,
            cost_type,
            amount,
            notes,
            reference_month,
            receipt_url,
            team_id,
            collaborator_id
        )
        SELECT
            NEW.target_id,
            COALESCE(NEW.metadata->>'tipo', 'outros'),
            (NEW.metadata->>'valor')::NUMERIC,
            NEW.metadata->>'observacoes',
            NEW.created_at::DATE,
            NEW.metadata->>'foto_nf',
            op.team_id,
            NEW.actor_user_id
        FROM operium_profiles op
        WHERE op.user_id = NEW.actor_user_id
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Comment
COMMENT ON FUNCTION public.sync_vehicle_expense_to_costs IS 
'Syncs VEHICLE_EXPENSE events to vehicle_costs table. Fixed to use correct column names: notes, reference_month.';

