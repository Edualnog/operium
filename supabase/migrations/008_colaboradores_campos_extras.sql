-- Migration: Adicionar campos extras para colaboradores
-- Foto, data de admissão e melhorias no cadastro

-- Adicionar campos à tabela colaboradores
ALTER TABLE colaboradores 
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS data_admissao DATE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_colaboradores_email ON colaboradores(email) WHERE email IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN colaboradores.foto_url IS 'URL da foto do colaborador (armazenada no Supabase Storage)';
COMMENT ON COLUMN colaboradores.data_admissao IS 'Data de admissão do colaborador';
COMMENT ON COLUMN colaboradores.email IS 'Email do colaborador';
COMMENT ON COLUMN colaboradores.cpf IS 'CPF do colaborador';
COMMENT ON COLUMN colaboradores.endereco IS 'Endereço completo do colaborador';
COMMENT ON COLUMN colaboradores.observacoes IS 'Observações e notas sobre o colaborador';

