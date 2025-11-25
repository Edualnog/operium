-- Adicionar coluna avatar_id na tabela profiles para armazenar o ID do avatar selecionado
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_id INTEGER;

-- Comentário na coluna
COMMENT ON COLUMN public.profiles.avatar_id IS 'ID do avatar selecionado pelo usuário (1-4)';

