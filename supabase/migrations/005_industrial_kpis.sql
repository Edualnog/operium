-- Migration para suportar KPIs industriais de almoxarifado
-- Adiciona campos necessários para cálculos avançados

-- Adicionar campos à tabela movimentacoes
ALTER TABLE movimentacoes 
  ADD COLUMN IF NOT EXISTS prazo_devolucao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS saida_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS devolucao_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campos à tabela ferramentas para controle industrial
ALTER TABLE ferramentas
  ADD COLUMN IF NOT EXISTS ponto_ressuprimento INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_time_dias INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS validade TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tipo_item TEXT DEFAULT 'ferramenta' CHECK (tipo_item IN ('ferramenta', 'consumivel', 'epi'));

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_movimentacoes_prazo_devolucao ON movimentacoes(prazo_devolucao) WHERE prazo_devolucao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_saida_at ON movimentacoes(saida_at) WHERE saida_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_devolucao_at ON movimentacoes(devolucao_at) WHERE devolucao_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ferramentas_tipo_item ON ferramentas(tipo_item) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ferramentas_validade ON ferramentas(validade) WHERE validade IS NOT NULL;

-- Função para calcular tempo médio de retorno (TMR)
CREATE OR REPLACE FUNCTION calcular_tmr(p_profile_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  tempo_medio NUMERIC;
BEGIN
  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (devolucao_at - saida_at)) / 3600.0),
    0
  )
  INTO tempo_medio
  FROM movimentacoes
  WHERE profile_id = p_profile_id
    AND tipo = 'retirada'
    AND saida_at IS NOT NULL
    AND devolucao_at IS NOT NULL
    AND devolucao_at > saida_at;
  
  RETURN COALESCE(tempo_medio, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular índice de atraso de devolução
CREATE OR REPLACE FUNCTION calcular_indice_atraso(p_profile_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_devolucoes INTEGER;
  devolucoes_atrasadas INTEGER;
  percentual NUMERIC;
BEGIN
  -- Total de devoluções com prazo definido
  SELECT COUNT(*)
  INTO total_devolucoes
  FROM movimentacoes
  WHERE profile_id = p_profile_id
    AND tipo = 'devolucao'
    AND prazo_devolucao IS NOT NULL
    AND devolucao_at IS NOT NULL;
  
  -- Devoluções feitas após o prazo
  SELECT COUNT(*)
  INTO devolucoes_atrasadas
  FROM movimentacoes
  WHERE profile_id = p_profile_id
    AND tipo = 'devolucao'
    AND prazo_devolucao IS NOT NULL
    AND devolucao_at IS NOT NULL
    AND devolucao_at > prazo_devolucao;
  
  IF total_devolucoes = 0 THEN
    RETURN 0;
  END IF;
  
  percentual := (devolucoes_atrasadas::NUMERIC / total_devolucoes::NUMERIC) * 100;
  RETURN COALESCE(percentual, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular score de responsabilidade do colaborador
CREATE OR REPLACE FUNCTION calcular_score_responsabilidade(p_profile_id UUID, p_colaborador_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_retiradas INTEGER;
  devolucoes_no_prazo INTEGER;
  score NUMERIC;
BEGIN
  -- Total de retiradas do colaborador
  SELECT COUNT(*)
  INTO total_retiradas
  FROM movimentacoes
  WHERE profile_id = p_profile_id
    AND colaborador_id = p_colaborador_id
    AND tipo = 'retirada';
  
  -- Devoluções no prazo
  SELECT COUNT(*)
  INTO devolucoes_no_prazo
  FROM movimentacoes m1
  WHERE m1.profile_id = p_profile_id
    AND m1.colaborador_id = p_colaborador_id
    AND m1.tipo = 'devolucao'
    AND EXISTS (
      SELECT 1 FROM movimentacoes m2
      WHERE m2.profile_id = p_profile_id
        AND m2.colaborador_id = p_colaborador_id
        AND m2.ferramenta_id = m1.ferramenta_id
        AND m2.tipo = 'retirada'
        AND m2.saida_at IS NOT NULL
        AND (
          m1.devolucao_at <= m2.prazo_devolucao
          OR m2.prazo_devolucao IS NULL
        )
    );
  
  IF total_retiradas = 0 THEN
    RETURN 0;
  END IF;
  
  score := (devolucoes_no_prazo::NUMERIC / total_retiradas::NUMERIC) * 100;
  RETURN COALESCE(score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular risco de ruptura
CREATE OR REPLACE FUNCTION calcular_risco_ruptura(
  p_profile_id UUID,
  p_ferramenta_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  consumo_medio NUMERIC;
  lead_time INTEGER;
  estoque_atual INTEGER;
  risco NUMERIC;
BEGIN
  -- Buscar dados da ferramenta
  SELECT 
    COALESCE(quantidade_disponivel, 0),
    COALESCE(lead_time_dias, 7)
  INTO estoque_atual, lead_time
  FROM ferramentas
  WHERE id = p_ferramenta_id
    AND profile_id = p_profile_id;
  
  -- Calcular consumo médio diário (últimos 30 dias)
  SELECT COALESCE(
    AVG(quantidade::NUMERIC),
    0
  )
  INTO consumo_medio
  FROM movimentacoes
  WHERE profile_id = p_profile_id
    AND ferramenta_id = p_ferramenta_id
    AND tipo = 'retirada'
    AND data >= NOW() - INTERVAL '30 days';
  
  IF estoque_atual = 0 THEN
    RETURN 100;
  END IF;
  
  -- Score: (consumo_medio * lead_time) / estoque_atual * 100
  risco := LEAST((consumo_medio * lead_time) / estoque_atual * 100, 100);
  RETURN COALESCE(risco, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON COLUMN movimentacoes.prazo_devolucao IS 'Prazo limite para devolução da ferramenta';
COMMENT ON COLUMN movimentacoes.saida_at IS 'Data/hora exata da saída';
COMMENT ON COLUMN movimentacoes.devolucao_at IS 'Data/hora exata da devolução';
COMMENT ON COLUMN ferramentas.ponto_ressuprimento IS 'Quantidade mínima que dispara alerta de compra';
COMMENT ON COLUMN ferramentas.lead_time_dias IS 'Tempo médio de reposição em dias';
COMMENT ON COLUMN ferramentas.validade IS 'Data de validade (principalmente para EPIs)';
COMMENT ON COLUMN ferramentas.tipo_item IS 'Tipo: ferramenta, consumivel ou epi';

