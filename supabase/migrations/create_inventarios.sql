-- Módulo de Inventário/Balanço de Estoque
-- Execute este script no Supabase SQL Editor

-- Tabela principal de inventários
CREATE TABLE IF NOT EXISTS inventarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizado', 'cancelado')),
  responsavel TEXT,
  escopo TEXT DEFAULT 'todos' CHECK (escopo IN ('todos', 'categoria', 'selecionados')),
  categoria_filtro TEXT,
  observacoes TEXT,
  total_itens INTEGER DEFAULT 0,
  itens_contados INTEGER DEFAULT 0,
  total_divergencias INTEGER DEFAULT 0,
  valor_divergencias DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de itens do inventário
CREATE TABLE IF NOT EXISTS inventario_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
  ferramenta_id UUID NOT NULL REFERENCES ferramentas(id) ON DELETE CASCADE,
  quantidade_sistema INTEGER NOT NULL DEFAULT 0,
  quantidade_fisica INTEGER,
  diferenca INTEGER,
  contado BOOLEAN DEFAULT FALSE,
  data_contagem TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de ajustes de inventário
CREATE TABLE IF NOT EXISTS inventario_ajustes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_item_id UUID NOT NULL REFERENCES inventario_itens(id) ON DELETE CASCADE,
  quantidade_anterior INTEGER NOT NULL,
  quantidade_nova INTEGER NOT NULL,
  diferenca INTEGER NOT NULL,
  motivo TEXT NOT NULL CHECK (motivo IN ('perda_avaria', 'furto_extravio', 'erro_lancamento', 'vencimento_descarte', 'transferencia', 'outro')),
  observacao TEXT,
  aprovado_por TEXT,
  aplicado BOOLEAN DEFAULT FALSE,
  data_ajuste TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inventarios_profile ON inventarios(profile_id);
CREATE INDEX IF NOT EXISTS idx_inventarios_status ON inventarios(status);
CREATE INDEX IF NOT EXISTS idx_inventario_itens_inventario ON inventario_itens(inventario_id);
CREATE INDEX IF NOT EXISTS idx_inventario_itens_ferramenta ON inventario_itens(ferramenta_id);
CREATE INDEX IF NOT EXISTS idx_inventario_ajustes_item ON inventario_ajustes(inventario_item_id);

-- RLS Policies
ALTER TABLE inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_ajustes ENABLE ROW LEVEL SECURITY;

-- Políticas para inventarios
CREATE POLICY "Users can view own inventarios" ON inventarios
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own inventarios" ON inventarios
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own inventarios" ON inventarios
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own inventarios" ON inventarios
  FOR DELETE USING (auth.uid() = profile_id);

-- Políticas para inventario_itens
CREATE POLICY "Users can view own inventario_itens" ON inventario_itens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM inventarios WHERE id = inventario_itens.inventario_id AND profile_id = auth.uid())
  );

CREATE POLICY "Users can insert own inventario_itens" ON inventario_itens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM inventarios WHERE id = inventario_itens.inventario_id AND profile_id = auth.uid())
  );

CREATE POLICY "Users can update own inventario_itens" ON inventario_itens
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM inventarios WHERE id = inventario_itens.inventario_id AND profile_id = auth.uid())
  );

CREATE POLICY "Users can delete own inventario_itens" ON inventario_itens
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM inventarios WHERE id = inventario_itens.inventario_id AND profile_id = auth.uid())
  );

-- Políticas para inventario_ajustes
CREATE POLICY "Users can view own inventario_ajustes" ON inventario_ajustes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM inventario_itens ii
      JOIN inventarios i ON i.id = ii.inventario_id
      WHERE ii.id = inventario_ajustes.inventario_item_id AND i.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own inventario_ajustes" ON inventario_ajustes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventario_itens ii
      JOIN inventarios i ON i.id = ii.inventario_id
      WHERE ii.id = inventario_ajustes.inventario_item_id AND i.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own inventario_ajustes" ON inventario_ajustes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM inventario_itens ii
      JOIN inventarios i ON i.id = ii.inventario_id
      WHERE ii.id = inventario_ajustes.inventario_item_id AND i.profile_id = auth.uid()
    )
  );

