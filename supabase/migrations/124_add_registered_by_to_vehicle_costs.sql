-- =====================================================
-- ADD: registered_by_user_id to vehicle_costs
-- Track who registered each expense
-- =====================================================

-- Add column for who registered the expense
ALTER TABLE public.vehicle_costs 
ADD COLUMN IF NOT EXISTS registered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add column for user name (denormalized for easy display)
ALTER TABLE public.vehicle_costs 
ADD COLUMN IF NOT EXISTS registered_by_name TEXT;

-- Create index for querying by user
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_registered_by 
ON public.vehicle_costs(registered_by_user_id) 
WHERE registered_by_user_id IS NOT NULL;

-- Update the sync function to include user info
CREATE OR REPLACE FUNCTION public.sync_vehicle_expense_to_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Sync vehicle expense event to vehicle_costs table
    IF NEW.type = 'VEHICLE_EXPENSE' THEN
        -- Get user name from operium_profiles
        SELECT COALESCE(op.name, u.email)
        INTO v_user_name
        FROM operium_profiles op
        LEFT JOIN auth.users u ON u.id = op.user_id
        WHERE op.user_id = NEW.actor_user_id
        LIMIT 1;
        
        INSERT INTO vehicle_costs (
            vehicle_id,
            cost_type,
            amount,
            notes,
            reference_month,
            receipt_url,
            profile_id,
            team_id,
            registered_by_user_id,
            registered_by_name
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
            NEW.actor_user_id,
            v_user_name
        FROM operium_profiles op
        WHERE op.user_id = NEW.actor_user_id
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.vehicle_costs.registered_by_user_id IS 
'ID do usuário que registrou esta despesa';

COMMENT ON COLUMN public.vehicle_costs.registered_by_name IS 
'Nome do usuário que registrou (denormalizado para exibição rápida)';
