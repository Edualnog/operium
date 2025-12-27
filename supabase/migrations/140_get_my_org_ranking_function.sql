-- Create a SECURE function to get organization collaborators for ranking
-- This uses the operium_profiles.org_id to ensure proper organization isolation

CREATE OR REPLACE FUNCTION get_my_org_ranking()
RETURNS TABLE (
    id UUID,
    nome TEXT,
    foto_url TEXT,
    almox_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Get the user's org_id from operium_profiles
    SELECT op.org_id INTO v_org_id
    FROM operium_profiles op
    WHERE op.user_id = auth.uid()
    AND op.active = true
    LIMIT 1;

    -- If no org_id found, return empty
    IF v_org_id IS NULL THEN
        RETURN;
    END IF;

    -- Return collaborators from the same organization
    RETURN QUERY
    SELECT 
        c.id,
        c.nome,
        c.foto_url,
        COALESCE(c.almox_score, 500) as almox_score
    FROM colaboradores c
    WHERE c.profile_id = v_org_id
    AND c.demitido_at IS NULL
    ORDER BY COALESCE(c.almox_score, 500) DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_org_ranking() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION get_my_org_ranking() IS 
'Securely returns collaborators ranking for the authenticated user''s organization. 
Uses operium_profiles.org_id for organization isolation.';
