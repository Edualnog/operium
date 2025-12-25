-- ============================================================================
-- Migration 116: Add vehicle info to get_my_team_info function
-- Problem:
--   Field app needs to display team's assigned vehicle as fixed (read-only)
--   Currently, vehicle info is not returned by get_my_team_info
-- Solution:
--   Update the function to include vehicle_id, vehicle_plate, vehicle_model
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_my_team_info();

-- Recreate function with vehicle info
CREATE OR REPLACE FUNCTION public.get_my_team_info()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_team_id UUID;
    v_result JSON;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get user's team_id from operium_profiles
    SELECT team_id INTO v_team_id
    FROM operium_profiles
    WHERE user_id = v_user_id AND active = true
    LIMIT 1;

    IF v_team_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Build result JSON with team info, leader, vehicle, and members
    SELECT json_build_object(
        'id', t.id,
        'name', t.name,
        'status', t.status,
        'current_location', t.current_location,
        'leader_id', t.leader_id,
        'leader_name', c.nome,
        'leader_photo', c.foto_url,
        -- Vehicle info
        'vehicle_id', t.vehicle_id,
        'vehicle_plate', v.plate,
        'vehicle_model', v.model,
        -- Members array
        'members', COALESCE(
            (
                SELECT json_agg(json_build_object(
                    'id', col.id,
                    'name', col.nome,
                    'role', tm.role,
                    'photo', col.foto_url
                ))
                FROM team_members tm
                JOIN colaboradores col ON col.id = tm.colaborador_id
                WHERE tm.team_id = t.id AND tm.left_at IS NULL
            ),
            '[]'::json
        )
    ) INTO v_result
    FROM teams t
    LEFT JOIN colaboradores c ON c.id = t.leader_id
    LEFT JOIN vehicles v ON v.id = t.vehicle_id
    WHERE t.id = v_team_id;

    RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_team_info() TO authenticated;

COMMENT ON FUNCTION public.get_my_team_info() IS
'Returns team info (name, status, location, leader, vehicle, members) for the current user.
Uses SECURITY DEFINER to bypass RLS and allow field app users to see leader and vehicle info.';
