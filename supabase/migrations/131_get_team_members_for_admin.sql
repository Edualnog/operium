-- Migration: Fix get_team_members_for_admin function
-- Problem: org_id of team can be NULL, need to also check profile_id

CREATE OR REPLACE FUNCTION public.get_team_members_for_admin(p_team_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    photo_url TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    collaborator_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_team_owner UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Get user's org_id (they must be admin OR be the owner)
    SELECT op.org_id INTO v_org_id
    FROM operium_profiles op
    WHERE op.user_id = v_user_id
      AND op.role = 'ADMIN'
      AND op.active = true;

    -- If not found as ADMIN, check if user is the org owner (user_id = org_id)
    IF v_org_id IS NULL THEN
        SELECT op.org_id INTO v_org_id
        FROM operium_profiles op
        WHERE op.user_id = v_user_id
          AND op.user_id = op.org_id
          AND op.active = true;
    END IF;

    IF v_org_id IS NULL THEN
        RETURN; -- Not an admin or owner
    END IF;

    -- Get the team owner (profile_id or org_id)
    SELECT COALESCE(t.org_id, t.profile_id) INTO v_team_owner
    FROM teams t
    WHERE t.id = p_team_id;

    -- Verify team belongs to this org
    IF v_team_owner IS NULL OR v_team_owner != v_org_id THEN
        RETURN; -- Team doesn't belong to user's org
    END IF;

    -- Return members from operium_profiles who are in this team
    -- Match by org_id = v_org_id (the admin's org)
    RETURN QUERY
    SELECT 
        op.user_id,
        op.name,
        op.photo_url,
        op.role,
        op.created_at,
        op.collaborator_id
    FROM operium_profiles op
    WHERE op.team_id = p_team_id
      AND op.org_id = v_org_id
      AND op.active = true;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_team_members_for_admin(UUID) TO authenticated;
