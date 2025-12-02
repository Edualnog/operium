-- Campos adicionais para produtos (ferramentas/EPIs/consumíveis)
ALTER TABLE ferramentas
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS tamanho TEXT,
  ADD COLUMN IF NOT EXISTS cor TEXT,
  ADD COLUMN IF NOT EXISTS tipo_item TEXT DEFAULT 'ferramenta' CHECK (tipo_item IN ('ferramenta', 'consumivel', 'epi'));

CREATE INDEX IF NOT EXISTS idx_ferramentas_codigo ON ferramentas(codigo);
COMMENT ON COLUMN ferramentas.codigo IS 'Código interno do produto (gerado automaticamente)';
COMMENT ON COLUMN ferramentas.foto_url IS 'URL da imagem do produto';
COMMENT ON COLUMN ferramentas.tamanho IS 'Tamanho/medida do produto';
COMMENT ON COLUMN ferramentas.cor IS 'Cor do produto';
COMMENT ON COLUMN ferramentas.tipo_item IS 'Tipo: ferramenta, consumivel ou epi';
