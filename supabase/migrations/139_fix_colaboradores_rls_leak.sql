-- URGENT: Remove the broken RLS policy that causes data leak
-- The previous policy was incorrectly allowing cross-organization access

DROP POLICY IF EXISTS "Org members can view colaboradores" ON colaboradores;

-- The original policy "Users can view own colaboradores" (profile_id = auth.uid()) should remain
-- This ensures only the owner of the organization can see their colaboradores
