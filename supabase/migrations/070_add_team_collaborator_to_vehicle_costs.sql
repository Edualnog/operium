-- ============================================================================
-- ADD TEAM AND COLLABORATOR TRACKING TO VEHICLE_COSTS
-- ============================================================================
-- Track which team and collaborator registered each vehicle expense

-- Add team_id and collaborator_id columns
ALTER TABLE vehicle_costs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE vehicle_costs ADD COLUMN IF NOT EXISTS collaborator_id UUID;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_team ON vehicle_costs(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_collaborator ON vehicle_costs(collaborator_id) WHERE collaborator_id IS NOT NULL;

-- ============================================================================
-- UPDATE SYNC FUNCTION TO INCLUDE TEAM AND COLLABORATOR
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_vehicle_expense_to_costs()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (it's already there, but this ensures it uses the new function)
DROP TRIGGER IF EXISTS trigger_sync_vehicle_expense ON operium_events;
CREATE TRIGGER trigger_sync_vehicle_expense
    AFTER INSERT ON operium_events
    FOR EACH ROW
    EXECUTE FUNCTION sync_vehicle_expense_to_costs();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN vehicle_costs.team_id IS
'Team that registered this expense (from field user team)';

COMMENT ON COLUMN vehicle_costs.collaborator_id IS
'Field user (collaborator) who registered this expense';
