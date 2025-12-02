-- Adicionar campos de empresa na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN public.profiles.company_name IS 'Nome da empresa do usuário';
COMMENT ON COLUMN public.profiles.cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN public.profiles.company_email IS 'Email da empresa';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone de contato';

