-- Migration: Allow admin to view team members from operium_profiles
-- Purpose: Enable dashboard to see field collaborators who joined teams via app

-- Create a function to get team members that bypasses RLS
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
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Get user's org_id (they must be admin)
    SELECT op.org_id INTO v_org_id
    FROM operium_profiles op
    WHERE op.user_id = v_user_id
      AND op.role = 'ADMIN'
      AND op.active = true;

    IF v_org_id IS NULL THEN
        RETURN; -- Not an admin
    END IF;

    -- Verify team belongs to this org
    IF NOT EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = p_team_id
          AND (t.profile_id = v_org_id OR t.org_id = v_org_id)
    ) THEN
        RETURN; -- Team doesn't belong to user's org
    END IF;

    -- Return members from operium_profiles who are in this team
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

-- Comment
COMMENT ON FUNCTION public.get_team_members_for_admin IS
'Returns operium_profiles members of a team, bypassing RLS. Only works for ADMIN users.';
