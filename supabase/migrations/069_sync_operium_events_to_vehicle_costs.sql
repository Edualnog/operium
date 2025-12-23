-- ============================================================================
-- ADD RECEIPT_URL TO VEHICLE_COSTS & SYNC OPERIUM_EVENTS
-- ============================================================================
-- 1. Add receipt_url column to vehicle_costs if it doesn't exist
-- 2. Create trigger to sync VEHICLE_EXPENSE events to vehicle_costs

-- Add receipt_url column
ALTER TABLE vehicle_costs ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- ============================================================================
-- SYNC FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_vehicle_expense_to_costs()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo TEXT;
    v_valor NUMERIC;
    v_observacoes TEXT;
    v_foto_nf TEXT;
    v_reference_month DATE;
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

    -- Insert into vehicle_costs
    INSERT INTO vehicle_costs (
        vehicle_id,
        reference_month,
        cost_type,
        amount,
        notes,
        receipt_url,
        created_at
    ) VALUES (
        NEW.target_id,  -- vehicle_id is stored in target_id
        v_reference_month,
        v_tipo,
        v_valor,
        v_observacoes,
        v_foto_nf,
        NEW.created_at
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_vehicle_expense ON operium_events;
CREATE TRIGGER trigger_sync_vehicle_expense
    AFTER INSERT ON operium_events
    FOR EACH ROW
    EXECUTE FUNCTION sync_vehicle_expense_to_costs();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION sync_vehicle_expense_to_costs() IS
'Automatically syncs VEHICLE_EXPENSE events from operium_events to vehicle_costs table for dashboard visibility';

COMMENT ON COLUMN vehicle_costs.receipt_url IS
'URL to receipt photo uploaded by field users';
