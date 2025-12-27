-- ============================================================================
-- Migration 134: Fix get_user_org_id search_path security warning
-- Garante que a função tenha search_path definido corretamente
-- ============================================================================

-- Recriar função com search_path explícito para resolver warning de segurança
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT org_id FROM operium_profiles WHERE user_id = auth.uid() AND active = true LIMIT 1
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.get_user_org_id() IS
'Returns the org_id of the current authenticated user. Used in RLS policies. SECURITY DEFINER with search_path = public for security.';
