-- Migration: Fix get_teams_for_user_org to also check profile_id
-- Problem: Teams are created with profile_id but function only checks org_id
-- Solution: Also check if team's profile_id matches the user's org_id (which is profile_id in the main system)

CREATE OR REPLACE FUNCTION public.get_teams_for_user_org()
RETURNS TABLE (
    id UUID,
    name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Get user's org_id from operium_profiles
    SELECT op.org_id INTO v_org_id
    FROM operium_profiles op
    WHERE op.user_id = v_user_id
      AND op.active = true
    LIMIT 1;

    -- If user has no org_id, return empty
    IF v_org_id IS NULL THEN
        RETURN;
    END IF;

    -- Return all active teams for this organization
    -- Check BOTH org_id (new field) and profile_id (legacy - used in dashboard)
    RETURN QUERY
    SELECT t.id, t.name
    FROM teams t
    WHERE (t.org_id = v_org_id OR t.profile_id = v_org_id)
      AND t.deleted_at IS NULL
    ORDER BY t.name;
END;
$$;

-- Ensure grant exists
GRANT EXECUTE ON FUNCTION public.get_teams_for_user_org() TO authenticated;

COMMENT ON FUNCTION public.get_teams_for_user_org() IS
'Returns all active teams for the current user''s organization. Checks both org_id and profile_id.';
