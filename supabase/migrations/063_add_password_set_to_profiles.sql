-- ============================================================================
-- FEATURE: Add password_set flag to profiles
-- ============================================================================

-- Add password_set column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;

-- Backfill existing users: assume if they exist, they have a password (or logged in via OAuth)
-- Ideally we would check auth.users.encrypted_password but we can't easily join cross-schema here without permissions or complexity.
-- For now, we assume existing profiles are "set".
UPDATE profiles
SET password_set = true
WHERE password_set IS FALSE;

-- Comment
COMMENT ON COLUMN profiles.password_set IS 'Indicates if the user has set a password. Used for onboarding flow.';
