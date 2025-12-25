-- ============================================================================
-- Migration 114: Create function to get teams by org_id
-- Problem: RLS policies on teams table are too restrictive for field app
--          onboarding - collaborators need to see all teams in their org
--          even if they didn't create them.
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to fetch
--           teams for a given org_id, validating that the caller belongs
--           to that organization.
-- ============================================================================

-- Function to get available teams for onboarding
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
    RETURN QUERY
    SELECT t.id, t.name
    FROM teams t
    WHERE t.org_id = v_org_id
      AND t.deleted_at IS NULL
    ORDER BY t.name;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_teams_for_user_org() TO authenticated;

COMMENT ON FUNCTION public.get_teams_for_user_org() IS
'Returns all active teams for the current user''s organization. Used in field app onboarding.';
