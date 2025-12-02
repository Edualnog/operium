-- Campos extras para consertos (local, prazo e prioridade)
ALTER TABLE consertos
  ADD COLUMN IF NOT EXISTS local_conserto TEXT,
  ADD COLUMN IF NOT EXISTS prazo DATE,
  ADD COLUMN IF NOT EXISTS prioridade TEXT;

COMMENT ON COLUMN consertos.local_conserto IS 'Local onde o conserto está sendo realizado ou aguardando';
COMMENT ON COLUMN consertos.prazo IS 'Prazo previsto para conclusão do conserto';
COMMENT ON COLUMN consertos.prioridade IS 'Prioridade do conserto (baixa, media, alta)';
