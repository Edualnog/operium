-- Migration: Allow operium users to view vehicles from their organization
-- This fixes the issue where collaborators (FIELD/WAREHOUSE) cannot see the parent org's vehicles

-- Add policy for operium users to SELECT vehicles where profile_id matches their org_id
DROP POLICY IF EXISTS "Operium users can view org vehicles" ON vehicles;

CREATE POLICY "Operium users can view org vehicles"
ON vehicles
FOR SELECT
USING (
    profile_id IN (
        SELECT org_id FROM operium_profiles 
        WHERE user_id = auth.uid() AND active = true
    )
);

-- Note: The existing "Users can view own vehicles" policy handles the org owner (admin)
-- This new policy handles collaborators viewing the org's vehicles
