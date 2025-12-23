-- ============================================================================
-- FEATURE: Ensure password_set = false for invited users
-- ============================================================================
-- When a user is invited via admin.inviteUserByEmail(), we need to:
-- 1. Create a profile entry with password_set = false if it doesn't exist
-- 2. Update password_set = false if profile already exists

-- Drop existing trigger and function to recreate with updated logic
DROP TRIGGER IF EXISTS on_auth_user_created_operium ON auth.users;
DROP FUNCTION IF EXISTS public.handle_operium_invite();

-- Recreate function with profile creation logic
CREATE OR REPLACE FUNCTION public.handle_operium_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_role TEXT;
    v_name TEXT;
BEGIN
    -- Extract data from metadata
    v_org_id := (NEW.raw_user_meta_data->>'operium_org_id')::UUID;
    v_role := NEW.raw_user_meta_data->>'operium_role';
    v_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email
    );

    -- If Operium data exists in metadata, this is an invited user
    IF v_org_id IS NOT NULL AND v_role IS NOT NULL THEN
        -- Create operium_profile if not exists (with name)
        IF NOT EXISTS (SELECT 1 FROM operium_profiles WHERE user_id = NEW.id) THEN
            INSERT INTO operium_profiles (user_id, org_id, role, active, onboarding_complete, name)
            VALUES (NEW.id, v_org_id, v_role, true, false, v_name);
        ELSE
            -- Update existing profile with name if not set
            UPDATE operium_profiles 
            SET name = COALESCE(name, v_name)
            WHERE user_id = NEW.id AND name IS NULL;
        END IF;

        -- Create or update profiles entry with password_set = false
        -- This ensures the user will be redirected to password creation page
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
            INSERT INTO profiles (id, password_set)
            VALUES (NEW.id, false);
        ELSE
            UPDATE profiles SET password_set = false WHERE id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created_operium
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_operium_invite();

COMMENT ON FUNCTION public.handle_operium_invite IS 
    'Creates operium_profile and sets password_set=false for invited users';
