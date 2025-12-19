-- Migration: 041_restore_onboarding_immutability.sql
-- Description: Restaura proteção de imutabilidade para campos de onboarding
-- Nota: Agora que o sistema está alinhado, podemos proteger os campos após preenchimento

-- Função para impedir alteração de campos de onboarding após preenchimento
CREATE OR REPLACE FUNCTION public.protect_onboarding_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Só bloquear se os campos ANTIGOS já estavam preenchidos
    -- e estão sendo alterados para valores diferentes
    IF OLD.company_name IS NOT NULL AND OLD.company_name IS DISTINCT FROM NEW.company_name THEN
        RAISE EXCEPTION 'O campo company_name é imutável após o onboarding';
    END IF;
    
    IF OLD.industry_segment IS NOT NULL AND OLD.industry_segment IS DISTINCT FROM NEW.industry_segment THEN
        RAISE EXCEPTION 'O campo industry_segment é imutável após o onboarding';
    END IF;
    
    IF OLD.company_size IS NOT NULL AND OLD.company_size IS DISTINCT FROM NEW.company_size THEN
        RAISE EXCEPTION 'O campo company_size é imutável após o onboarding';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para proteger campos de onboarding
DROP TRIGGER IF EXISTS protect_onboarding_fields_trigger ON public.profiles;

CREATE TRIGGER protect_onboarding_fields_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_onboarding_fields();

COMMENT ON FUNCTION public.protect_onboarding_fields() IS 'Protege campos de onboarding contra alteração após preenchimento inicial';
