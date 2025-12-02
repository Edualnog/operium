-- Tabela para armazenar termos de responsabilidade assinados
CREATE TABLE IF NOT EXISTS termos_responsabilidade (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  movimentacao_id UUID REFERENCES movimentacoes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('retirada', 'devolucao')),
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  assinatura_url TEXT,
  assinatura_base64 TEXT,
  pdf_url TEXT,
  data_assinatura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_termos_profile_id ON termos_responsabilidade(profile_id);
CREATE INDEX IF NOT EXISTS idx_termos_colaborador_id ON termos_responsabilidade(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_termos_movimentacao_id ON termos_responsabilidade(movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_termos_data_assinatura ON termos_responsabilidade(data_assinatura DESC);

-- Habilitar RLS
ALTER TABLE termos_responsabilidade ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios termos
CREATE POLICY "Users can view own termos" ON termos_responsabilidade
  FOR SELECT USING (auth.uid() = profile_id);

-- Política para usuários criarem seus próprios termos
CREATE POLICY "Users can create own termos" ON termos_responsabilidade
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Política para usuários atualizarem seus próprios termos
CREATE POLICY "Users can update own termos" ON termos_responsabilidade
  FOR UPDATE USING (auth.uid() = profile_id);

-- Política para usuários excluírem seus próprios termos
CREATE POLICY "Users can delete own termos" ON termos_responsabilidade
  FOR DELETE USING (auth.uid() = profile_id);

