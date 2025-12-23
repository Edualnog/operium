-- ============================================================================
-- FEATURE: Auto-create OPERIUM profile from Invite Metadata
-- ============================================================================
-- Quando um usuário é convidado via admin.inviteUserByEmail(), passamos
-- org_id e role nos metadados (user_metadata).
-- Esta trigger intercepta a criação do usuário em auth.users e cria
-- automaticamente o perfil correspondente em operium_profiles.

CREATE OR REPLACE FUNCTION public.handle_operium_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_role TEXT;
BEGIN
    -- Extrair dados do metadata
    -- O cast (value ->> key) retorna TEXT, então precisamos castar para UUID para org_id
    v_org_id := (NEW.raw_user_meta_data->>'operium_org_id')::UUID;
    v_role := NEW.raw_user_meta_data->>'operium_role';

    -- Se existirem dados do Operium no metadata, criar o perfil
    IF v_org_id IS NOT NULL AND v_role IS NOT NULL THEN
        -- Verificar se já existe (paranoia check)
        IF NOT EXISTS (SELECT 1 FROM operium_profiles WHERE user_id = NEW.id) THEN
            INSERT INTO operium_profiles (user_id, org_id, role, active)
            VALUES (NEW.id, v_org_id, v_role, true);
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger para executar após INSERT em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_operium ON auth.users;
CREATE TRIGGER on_auth_user_created_operium
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_operium_invite();

COMMENT ON FUNCTION public.handle_operium_invite IS 
    'Cria automaticamente operium_profile se user_metadata contiver operium_org_id e operium_role';
