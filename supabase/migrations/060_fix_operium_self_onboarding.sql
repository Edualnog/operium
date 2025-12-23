-- ============================================================================
-- FIX V2: Usar RPC function com SECURITY DEFINER para self-onboarding
-- ============================================================================
-- A approach anterior com policy não funcionou porque operium_get_user_role()
-- retorna NULL quando não existe perfil, e a comparação IS NULL em WITH CHECK
-- não funciona como esperado com funções STABLE.
--
-- Solução: Criar uma função RPC com SECURITY DEFINER que faz o bypass do RLS

-- Dropar a policy que criamos antes (se existir)
DROP POLICY IF EXISTS "operium_profiles_insert" ON operium_profiles;

-- Restaurar a policy original do ADMIN (para quando já tem perfil)
CREATE POLICY "operium_profiles_insert_admin" ON operium_profiles
    FOR INSERT
    WITH CHECK (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    );

-- Função RPC para self-onboarding como ADMIN
-- SECURITY DEFINER permite bypass do RLS
CREATE OR REPLACE FUNCTION operium_create_admin_profile()
RETURNS operium_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_result operium_profiles;
BEGIN
    -- Pegar o user_id do usuário autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Verificar se já tem perfil
    IF EXISTS (SELECT 1 FROM operium_profiles WHERE user_id = v_user_id AND active = true) THEN
        RAISE EXCEPTION 'User already has an active OPERIUM profile';
    END IF;
    
    -- Criar perfil ADMIN onde org_id = user_id (dono da organização)
    INSERT INTO operium_profiles (user_id, org_id, role, active)
    VALUES (v_user_id, v_user_id, 'ADMIN', true)
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant para usuários autenticados
GRANT EXECUTE ON FUNCTION operium_create_admin_profile TO authenticated;

COMMENT ON FUNCTION operium_create_admin_profile IS 
    'Cria perfil ADMIN para o usuário autenticado. org_id = user_id (dono da organização)';
