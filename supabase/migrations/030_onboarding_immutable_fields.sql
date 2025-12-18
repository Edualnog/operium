-- Migration: 030_onboarding_immutable_fields.sql
-- Description: Adiciona company_size e trigger de imutabilidade para campos de onboarding
-- Requirement: Campos de onboarding são preenchidos uma única vez e não podem ser alterados

-- 1. Adicionar coluna company_size
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_size TEXT;

-- 2. Check constraint para company_size
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS company_size_check;

ALTER TABLE public.profiles
ADD CONSTRAINT company_size_check 
CHECK (company_size IS NULL OR company_size IN (
    'SOLO',      -- 1 pessoa
    'SMALL',     -- 2-10
    'MEDIUM',    -- 11-50
    'LARGE',     -- 51-200
    'ENTERPRISE' -- 200+
));

COMMENT ON COLUMN public.profiles.company_size IS 'Porte da empresa (imutável após onboarding)';

-- 3. Função para impedir alteração de campos de onboarding após preenchimento
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

-- 4. Trigger para proteger campos de onboarding
DROP TRIGGER IF EXISTS protect_onboarding_fields_trigger ON public.profiles;

CREATE TRIGGER protect_onboarding_fields_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_onboarding_fields();

-- Nota: service_role pode bypassar o trigger usando SECURITY DEFINER functions se necessário
