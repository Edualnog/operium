-- Migration: Add team_id and onboarding_complete to operium_profiles
-- Links collaborators to their team for expense tracking

-- Add team_id column to operium_profiles
ALTER TABLE operium_profiles 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add onboarding_complete flag (for team selection screen)
ALTER TABLE operium_profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Index for team lookups
CREATE INDEX IF NOT EXISTS idx_operium_profiles_team ON operium_profiles(team_id) WHERE team_id IS NOT NULL;

-- Mark existing users as onboarding complete (they don't need to see the selection)
UPDATE operium_profiles SET onboarding_complete = true WHERE onboarding_complete IS NULL;

-- RLS: Allow operium users to SELECT teams from their org
DROP POLICY IF EXISTS "Operium users can view org teams" ON teams;

CREATE POLICY "Operium users can view org teams"
ON teams
FOR SELECT
USING (
    profile_id IN (
        SELECT org_id FROM operium_profiles 
        WHERE user_id = auth.uid() AND active = true
    )
);

-- RLS: Allow operium users to update their own profile (for team selection)
DROP POLICY IF EXISTS "Users can update own operium profile" ON operium_profiles;

CREATE POLICY "Users can update own operium profile"
ON operium_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
