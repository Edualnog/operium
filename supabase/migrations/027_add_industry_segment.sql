-- Migration: 027_add_industry_segment.sql
-- Description: Adiciona segmento industrial ao perfil para permitir agregação anônima de dados.
-- Requirement: "agregáveis por organization.industry_segment"

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS industry_segment TEXT;

-- Check constraint para integridade de dados (Equity de Dados)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS industry_segment_check;

ALTER TABLE public.profiles
ADD CONSTRAINT industry_segment_check 
CHECK (industry_segment IN (
    'MANUFACTURING', 
    'CONSTRUCTION', 
    'LOGISTICS', 
    'MAINTENANCE_SERVICES', 
    'AGRO', 
    'OTHER'
));

COMMENT ON COLUMN public.profiles.industry_segment IS 'Segmento industrial para inteligência de mercado e bechmarking anônimo.';

-- Atualiza views existentes?
-- As views na tabela `analytics` usam `profile_id`. 
-- Para agregar por segmento, basta fazer o JOIN:
-- SELECT p.industry_segment, AVG(s.correction_ratio) 
-- FROM analytics.data_confidence_score s 
-- JOIN public.profiles p ON s.profile_id = p.id
-- GROUP BY p.industry_segment;
