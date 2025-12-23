-- ============================================================================
-- FIX: Function Search Path Security Warnings
-- ============================================================================
-- Set explicit search_path for security

-- Fix: sync_vehicle_expense_to_costs
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
            description,
            date,
            receipt_url,
            profile_id,
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
            NEW.org_id,
            op.team_id,
            NULL
        FROM operium_profiles op
        WHERE op.user_id = NEW.actor_user_id
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix: sync_user_name_to_operium_profile
CREATE OR REPLACE FUNCTION public.sync_user_name_to_operium_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- When a new user is created in auth.users, update operium_profiles with name
    UPDATE operium_profiles
    SET name = COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email
    )
    WHERE user_id = NEW.id;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION public.sync_vehicle_expense_to_costs IS 
'Syncs VEHICLE_EXPENSE events to vehicle_costs table. Uses SET search_path for security.';

COMMENT ON FUNCTION public.sync_user_name_to_operium_profile IS 
'Syncs user name from auth.users metadata to operium_profiles. Uses SET search_path for security.';
