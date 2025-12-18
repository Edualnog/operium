-- Migration: 029_enforce_onboarding_fields.sql
-- Description: Adiciona constraint para company_name obrigatório no onboarding
-- Requirement: company_name deve ter no mínimo 2 caracteres quando preenchido

-- Check constraint para company_name (mínimo 2 caracteres)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS company_name_check;

ALTER TABLE public.profiles
ADD CONSTRAINT company_name_check 
CHECK (company_name IS NULL OR length(trim(company_name)) >= 2);

COMMENT ON COLUMN public.profiles.company_name IS 'Nome do negócio (obrigatório no onboarding, mínimo 2 caracteres)';

-- Nota: A constraint para industry_segment já existe em 027_add_industry_segment.sql
-- com valores: MANUFACTURING, CONSTRUCTION, LOGISTICS, MAINTENANCE_SERVICES, AGRO, OTHER
