-- Campos de empresa para o perfil dos usuários
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS company_email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN profiles.company_name IS 'Nome da empresa do usuário';
COMMENT ON COLUMN profiles.cnpj IS 'CNPJ da empresa do usuário';
COMMENT ON COLUMN profiles.company_email IS 'Email de contato corporativo';
COMMENT ON COLUMN profiles.phone IS 'Telefone de contato';

CREATE INDEX IF NOT EXISTS idx_profiles_cnpj ON profiles(cnpj);
