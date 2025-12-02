-- Verificação detalhada de índices
-- Execute esta query para ver quais índices estão presentes

SELECT 
  indexname as "Índice",
  tablename as "Tabela",
  CASE 
    WHEN indexname IN (
      'idx_colaboradores_profile_id',
      'idx_ferramentas_profile_id',
      'idx_movimentacoes_profile_id',
      'idx_consertos_profile_id',
      'idx_ferramentas_estado',
      'idx_movimentacoes_tipo',
      'idx_movimentacoes_data',
      'idx_consertos_status',
      'idx_movimentacoes_profile_tipo_data',
      'idx_ferramentas_profile_estado',
      'idx_movimentacoes_ferramenta_id',
      'idx_movimentacoes_colaborador_id',
      'idx_consertos_ferramenta_id'
    ) THEN '✅ Esperado'
    ELSE '⚠️ Outro'
  END as "Status"
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_%' 
    OR tablename IN ('profiles', 'colaboradores', 'ferramentas', 'movimentacoes', 'consertos')
  )
ORDER BY 
  CASE WHEN indexname LIKE 'idx_%' THEN 0 ELSE 1 END,
  tablename,
  indexname;

