-- Índices para otimização de performance
-- Estes índices melhoram significativamente a velocidade das queries

-- Índice para profile_id (usado em todas as queries RLS)
CREATE INDEX IF NOT EXISTS idx_colaboradores_profile_id ON colaboradores(profile_id);
CREATE INDEX IF NOT EXISTS idx_ferramentas_profile_id ON ferramentas(profile_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_profile_id ON movimentacoes(profile_id);
CREATE INDEX IF NOT EXISTS idx_consertos_profile_id ON consertos(profile_id);

-- Índices para campos frequentemente usados em filtros
CREATE INDEX IF NOT EXISTS idx_ferramentas_estado ON ferramentas(estado) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes(tipo) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes(data) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consertos_status ON consertos(status) WHERE profile_id IS NOT NULL;

-- Índices compostos para queries mais complexas
CREATE INDEX IF NOT EXISTS idx_movimentacoes_profile_tipo_data ON movimentacoes(profile_id, tipo, data);
CREATE INDEX IF NOT EXISTS idx_ferramentas_profile_estado ON ferramentas(profile_id, estado);

-- Índice para foreign keys (melhora joins)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_ferramenta_id ON movimentacoes(ferramenta_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_colaborador_id ON movimentacoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_consertos_ferramenta_id ON consertos(ferramenta_id);

