-- ============================================================================
-- FIX: Permitir que usuários criem seu primeiro perfil OPERIUM como ADMIN
-- ============================================================================
-- O problema é que a policy operium_profiles_insert_admin requer que o usuário
-- já tenha um perfil para inserir, mas na primeira vez ele não tem.
-- Esta migration adiciona uma policy que permite a auto-criação do ADMIN.

-- Dropar a policy existente de INSERT para profiles
DROP POLICY IF EXISTS "operium_profiles_insert_admin" ON operium_profiles;

-- Nova policy: Permite inserir perfil SE:
-- 1. Usuário já é ADMIN e está adicionando membro à sua org (caso normal)
-- OU
-- 2. Usuário está criando seu PRÓPRIO perfil como ADMIN e org_id = seu user_id
--    (self-onboarding como dono da organização)
CREATE POLICY "operium_profiles_insert" ON operium_profiles
    FOR INSERT
    WITH CHECK (
        -- Caso 1: ADMIN adicionando membro à sua organização
        (
            org_id = operium_get_user_org_id() 
            AND operium_get_user_role() = 'ADMIN'
        )
        OR
        -- Caso 2: Self-onboarding - usuário criando SEU PRÓPRIO perfil ADMIN
        -- onde org_id = seu próprio user_id (ele é o dono da org)
        (
            user_id = auth.uid()
            AND org_id = auth.uid()
            AND role = 'ADMIN'
            AND operium_get_user_role() IS NULL  -- Usuário ainda não tem perfil
        )
    );

COMMENT ON POLICY "operium_profiles_insert" ON operium_profiles 
    IS 'ADMIN pode adicionar membros OU usuário pode criar seu próprio perfil ADMIN (org_id = user_id)';
