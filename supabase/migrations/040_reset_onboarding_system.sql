-- Migration: 040_reset_onboarding_system.sql
-- Description: Reseta o sistema de onboarding para permitir preenchimento fresh
-- Reason: Campos eram imutáveis, causando loops de redirecionamento

-- 1. Remover trigger de imutabilidade
DROP TRIGGER IF EXISTS protect_onboarding_fields_trigger ON public.profiles;

-- 2. Remover função de proteção
DROP FUNCTION IF EXISTS public.protect_onboarding_fields();

-- 3. Limpar campos de onboarding de TODOS os perfis para preencher novamente
UPDATE public.profiles
SET 
    company_name = NULL,
    industry_segment = NULL,
    company_size = NULL
WHERE company_name IS NOT NULL 
   OR industry_segment IS NOT NULL 
   OR company_size IS NOT NULL;

-- 4. Não vamos recriar o trigger - os campos poderão ser editados
-- Se no futuro quiser bloquear edição, adicione um novo trigger

COMMENT ON COLUMN public.profiles.company_name IS 'Nome da empresa (preenchido no onboarding)';
COMMENT ON COLUMN public.profiles.industry_segment IS 'Setor de atuação (preenchido no onboarding)';
COMMENT ON COLUMN public.profiles.company_size IS 'Porte da empresa (preenchido no onboarding)';
