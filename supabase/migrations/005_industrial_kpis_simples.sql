-- Migration simplificada - Execute no SQL Editor do Supabase
-- Adiciona apenas os campos essenciais sem quebrar funcionalidades existentes

-- Adicionar campos à tabela movimentacoes (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimentacoes' AND column_name = 'prazo_devolucao') THEN
    ALTER TABLE movimentacoes ADD COLUMN prazo_devolucao TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimentacoes' AND column_name = 'saida_at') THEN
    ALTER TABLE movimentacoes ADD COLUMN saida_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimentacoes' AND column_name = 'devolucao_at') THEN
    ALTER TABLE movimentacoes ADD COLUMN devolucao_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Adicionar campos à tabela ferramentas (se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ferramentas' AND column_name = 'ponto_ressuprimento') THEN
    ALTER TABLE ferramentas ADD COLUMN ponto_ressuprimento INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ferramentas' AND column_name = 'lead_time_dias') THEN
    ALTER TABLE ferramentas ADD COLUMN lead_time_dias INTEGER DEFAULT 7;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ferramentas' AND column_name = 'validade') THEN
    ALTER TABLE ferramentas ADD COLUMN validade TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ferramentas' AND column_name = 'tipo_item') THEN
    ALTER TABLE ferramentas ADD COLUMN tipo_item TEXT DEFAULT 'ferramenta';
    -- Adicionar constraint depois
    ALTER TABLE ferramentas ADD CONSTRAINT check_tipo_item CHECK (tipo_item IN ('ferramenta', 'consumivel', 'epi'));
  END IF;
END $$;

-- Criar índices (se não existirem)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_prazo_devolucao ON movimentacoes(prazo_devolucao) WHERE prazo_devolucao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_saida_at ON movimentacoes(saida_at) WHERE saida_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_devolucao_at ON movimentacoes(devolucao_at) WHERE devolucao_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ferramentas_tipo_item ON ferramentas(tipo_item) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ferramentas_validade ON ferramentas(validade) WHERE validade IS NOT NULL;

