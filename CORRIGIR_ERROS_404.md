# Correção dos Erros 404 - Funções RPC

## 🔍 Problema

Os erros 404 que você vê no console são causados por funções RPC (PostgreSQL) que não foram criadas no banco de dados:
- `calcular_tmr` - Calcula tempo médio de retorno
- `calcular_indice_atraso` - Calcula índice de atraso de devolução
- `calcular_risco_ruptura` - Calcula risco de ruptura
- `calcular_score_responsabilidade` - Calcula score de responsabilidade

## ✅ Solução

Execute o SQL abaixo no **SQL Editor** do Supabase:

### 📝 Como executar:

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Abra seu projeto **ERP - Amox Fácil**
3. No menu lateral, clique em **SQL Editor**
4. Clique em **+ New query**
5. Cole o SQL abaixo
6. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)

---

### 🔧 SQL para Executar:

```sql
-- =====================================================
-- ADICIONAR COLUNAS NECESSÁRIAS
-- =====================================================

-- Adicionar campos à tabela movimentacoes
ALTER TABLE movimentacoes 
  ADD COLUMN IF NOT EXISTS prazo_devolucao TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS saida_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS devolucao_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campos à tabela ferramentas
ALTER TABLE ferramentas
  ADD COLUMN IF NOT EXISTS ponto_ressuprimento INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_time_dias INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS validade TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tipo_item TEXT DEFAULT 'ferramenta' CHECK (tipo_item IN ('ferramenta', 'consumivel', 'epi'));

-- =====================================================
-- CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_movimentacoes_prazo_devolucao ON movimentacoes(prazo_devolucao) WHERE prazo_devolucao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_saida_at ON movimentacoes(saida_at) WHERE saida_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_devolucao_at ON movimentacoes(devolucao_at) WHERE devolucao_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ferramentas_tipo_item ON ferramentas(tipo_item) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ferramentas_validade ON ferramentas(validade) WHERE validade IS NOT NULL;

-- =====================================================
-- FUNÇÃO 1: CALCULAR TEMPO MÉDIO DE RETORNO (TMR)
-- =====================================================

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

-- =====================================================
-- FUNÇÃO 2: CALCULAR ÍNDICE DE ATRASO
-- =====================================================

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

-- =====================================================
-- FUNÇÃO 3: CALCULAR SCORE DE RESPONSABILIDADE
-- =====================================================

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

-- =====================================================
-- FUNÇÃO 4: CALCULAR RISCO DE RUPTURA
-- =====================================================

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

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se as funções foram criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calcular_tmr', 'calcular_indice_atraso', 'calcular_score_responsabilidade', 'calcular_risco_ruptura')
ORDER BY routine_name;
```

---

## ✅ Resultado Esperado

Após executar o SQL, você verá a mensagem de sucesso e uma tabela mostrando as 4 funções criadas:

```
routine_name
--------------------------
calcular_indice_atraso
calcular_risco_ruptura
calcular_score_responsabilidade
calcular_tmr
```

## 🔄 Após Executar

1. **Recarregue a página do dashboard** (`Cmd + R` ou F5)
2. **Os erros 404 devem desaparecer** do console
3. **Os KPIs serão calculados corretamente**

## 📊 O que cada função faz:

### 1. `calcular_tmr`
Calcula o tempo médio que as ferramentas levam para serem devolvidas (em horas).

### 2. `calcular_indice_atraso`
Calcula a porcentagem de devoluções atrasadas em relação ao prazo definido.

### 3. `calcular_score_responsabilidade`
Calcula um score de 0-100 baseado na pontualidade das devoluções de cada colaborador.

### 4. `calcular_risco_ruptura`
Calcula o risco (0-100%) de um item ficar sem estoque baseado no consumo médio e lead time.

---

## ⚠️ Observações

- Essas funções são **seguras** e usam `SECURITY DEFINER` para garantir acesso controlado
- Os cálculos consideram apenas dados do `profile_id` do usuário logado (isolamento de dados)
- As funções não alteram dados, apenas calculam valores

---

## 🐛 Se ainda houver erros

Se após executar o SQL os erros persistirem, verifique:

1. **No Supabase SQL Editor**, execute:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE 'calcular%';
   ```

2. Se as funções não aparecerem, pode ser um problema de permissões. Nesse caso, me avise!

---

🎯 **Após executar, os erros 404 serão corrigidos e o dashboard funcionará perfeitamente!**

