-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view own movimentacoes" ON movimentacoes;
DROP POLICY IF EXISTS "Users can insert own movimentacoes" ON movimentacoes;
DROP POLICY IF EXISTS "Users can update own movimentacoes" ON movimentacoes;
DROP POLICY IF EXISTS "Users can delete own movimentacoes" ON movimentacoes;

-- Create organization-aware policies (using operium_profiles linkage)
CREATE POLICY "Users can view organization movimentacoes"
ON movimentacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = auth.uid()
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = auth.uid() -- Backwards compatibility for solo users
);

CREATE POLICY "Users can insert organization movimentacoes"
ON movimentacoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = auth.uid()
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = auth.uid()
);

CREATE POLICY "Users can update organization movimentacoes"
ON movimentacoes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = auth.uid()
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = auth.uid()
);

CREATE POLICY "Users can delete organization movimentacoes"
ON movimentacoes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM operium_profiles op_user
    JOIN operium_profiles op_owner ON op_user.org_id = op_owner.org_id
    WHERE op_user.user_id = auth.uid()
    AND op_owner.user_id = movimentacoes.profile_id
  )
  OR
  profile_id = auth.uid()
);
