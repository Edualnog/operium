-- Migration: Simplify equipment assignment flow
-- Remove pending_acceptance requirement, make assignments immediate

-- 1. Update default status for new assignments
ALTER TABLE team_equipment 
ALTER COLUMN status SET DEFAULT 'in_use';

-- 2. Migrate existing pending_acceptance records to in_use
UPDATE team_equipment 
SET 
    status = 'in_use',
    accepted_at = COALESCE(accepted_at, assigned_at),
    accepted_by_user_id = NULL  -- Clear since it's auto-accepted
WHERE 
    status = 'pending_acceptance' 
    AND returned_at IS NULL;

-- 3. Add comment for clarity
COMMENT ON COLUMN team_equipment.status IS 
'Equipment status: in_use (active custody), pending_return (return requested), returned (custody ended), returned_with_issue (returned with discrepancy). Note: pending_acceptance is deprecated - new assignments are immediately in_use.';
