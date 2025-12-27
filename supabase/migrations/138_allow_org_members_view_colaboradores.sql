-- Allow organization members to view all collaborators in their organization
-- This is needed for the field app ranking feature

-- Add policy for org members to view colaboradores
CREATE POLICY "Org members can view colaboradores"
ON colaboradores
FOR SELECT
USING (
    profile_id IN (
        SELECT org_id 
        FROM operium_profiles 
        WHERE user_id = auth.uid() 
        AND active = true
    )
);

COMMENT ON POLICY "Org members can view colaboradores" ON colaboradores IS 
'Allows app collaborators to view the ranking of all collaborators in their organization';
