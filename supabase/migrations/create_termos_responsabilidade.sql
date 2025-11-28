-- =====================================================
-- MIGRATION: Tabela de Termos de Responsabilidade
-- Execute este SQL no painel do Supabase (SQL Editor)
-- =====================================================

-- Tabela para armazenar termos de responsabilidade assinados
CREATE TABLE IF NOT EXISTS termos_responsabilidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  movimentacao_id UUID REFERENCES movimentacoes(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('retirada', 'devolucao')),
  itens JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de {id, nome, quantidade}
  assinatura_url TEXT, -- URL da imagem da assinatura
  pdf_url TEXT, -- URL do PDF gerado
  data_assinatura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45), -- IP do dispositivo que assinou
  user_agent TEXT, -- Navegador/dispositivo
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_termos_profile_id ON termos_responsabilidade(profile_id);
CREATE INDEX IF NOT EXISTS idx_termos_colaborador_id ON termos_responsabilidade(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_termos_data ON termos_responsabilidade(profile_id, data_assinatura DESC);

-- RLS (Row Level Security)
ALTER TABLE termos_responsabilidade ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver seus próprios termos"
  ON termos_responsabilidade FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Usuários podem criar termos"
  ON termos_responsabilidade FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Usuários podem atualizar seus próprios termos"
  ON termos_responsabilidade FOR UPDATE
  USING (auth.uid() = profile_id);

-- =====================================================
-- BUCKET STORAGE: Criar bucket para documentos (se não existir)
-- Execute no painel Storage do Supabase
-- =====================================================
-- Nome do bucket: documentos
-- Public: false (para maior segurança)
-- Allowed MIME types: application/pdf, image/png, image/jpeg

-- Comentário: Para criar o bucket via SQL (requer permissões especiais):
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documentos', 'documentos', false)
-- ON CONFLICT (id) DO NOTHING;

