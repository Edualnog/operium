-- ============================================================================
-- ADD NAME FIELD TO OPERIUM_PROFILES
-- ============================================================================
-- Store user names directly in operium_profiles for easier queries

-- Add name column
ALTER TABLE operium_profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index for name searches
CREATE INDEX IF NOT EXISTS idx_operium_profiles_name ON operium_profiles(name);

-- ============================================================================
-- FUNCTION TO SYNC NAME FROM AUTH.USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_name_to_operium_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new user is created in auth.users, update operium_profiles with name
    UPDATE operium_profiles
    SET name = COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email
    )
    WHERE user_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to sync name changes
DROP TRIGGER IF EXISTS trigger_sync_user_name ON auth.users;
CREATE TRIGGER trigger_sync_user_name
    AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_name_to_operium_profile();

-- ============================================================================
-- BACKFILL EXISTING NAMES
-- ============================================================================
-- Update existing operium_profiles with names from auth.users
UPDATE operium_profiles op
SET name = COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = op.user_id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = op.user_id),
    (SELECT email FROM auth.users WHERE id = op.user_id)
)
WHERE name IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN operium_profiles.name IS
'User display name, synced from auth.users metadata';
