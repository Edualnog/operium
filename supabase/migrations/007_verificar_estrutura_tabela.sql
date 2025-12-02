-- Verificação da Estrutura do Banco - Retorna Resultados em Tabela
-- Execute no SQL Editor do Supabase

WITH verificacoes AS (
  SELECT 
    'Tabelas' as categoria,
    'profiles' as item,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
      THEN '✅ Existe' ELSE '❌ Não existe' END as status
  UNION ALL
  SELECT 'Tabelas', 'colaboradores',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'colaboradores')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Tabelas', 'ferramentas',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ferramentas')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Tabelas', 'movimentacoes',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movimentacoes')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Tabelas', 'consertos',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consertos')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'id')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'profile_id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'profile_id')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'ferramenta_id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'ferramenta_id')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'colaborador_id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'colaborador_id')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'tipo',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'tipo')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'quantidade',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'quantidade')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'data',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'data')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'saida_at (OPCIONAL)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'saida_at')
      THEN '✅ Existe' ELSE '⚠️ Não existe (opcional)' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'devolucao_at (OPCIONAL)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'devolucao_at')
      THEN '✅ Existe' ELSE '⚠️ Não existe (opcional)' END
  UNION ALL
  SELECT 'Colunas movimentacoes', 'prazo_devolucao (OPCIONAL)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'movimentacoes' AND column_name = 'prazo_devolucao')
      THEN '✅ Existe' ELSE '⚠️ Não existe (opcional)' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'id')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'profile_id',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'profile_id')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'nome',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'nome')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'categoria',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'categoria')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'quantidade_total',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'quantidade_total')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'quantidade_disponivel',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'quantidade_disponivel')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'estado',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'estado')
      THEN '✅ Existe' ELSE '❌ Não existe' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'tipo_item (OPCIONAL)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'tipo_item')
      THEN '✅ Existe' ELSE '⚠️ Não existe (opcional)' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'ponto_ressuprimento (OPCIONAL)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'ponto_ressuprimento')
      THEN '✅ Existe' ELSE '⚠️ Não existe (opcional)' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'lead_time_dias (OPCIONAL)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'lead_time_dias')
      THEN '✅ Existe' ELSE '⚠️ Não existe (opcional)' END
  UNION ALL
  SELECT 'Colunas ferramentas', 'validade (OPCIONAL)',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ferramentas' AND column_name = 'validade')
      THEN '✅ Existe' ELSE '⚠️ Não existe (opcional)' END
  UNION ALL
  SELECT 'RLS', 'profiles',
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'profiles' AND relrowsecurity = true)
      THEN '✅ Ativado' ELSE '❌ Não ativado' END
  UNION ALL
  SELECT 'RLS', 'colaboradores',
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'colaboradores' AND relrowsecurity = true)
      THEN '✅ Ativado' ELSE '❌ Não ativado' END
  UNION ALL
  SELECT 'RLS', 'ferramentas',
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ferramentas' AND relrowsecurity = true)
      THEN '✅ Ativado' ELSE '❌ Não ativado' END
  UNION ALL
  SELECT 'RLS', 'movimentacoes',
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'movimentacoes' AND relrowsecurity = true)
      THEN '✅ Ativado' ELSE '❌ Não ativado' END
  UNION ALL
  SELECT 'RLS', 'consertos',
    CASE WHEN EXISTS (SELECT 1 FROM pg_class WHERE relname = 'consertos' AND relrowsecurity = true)
      THEN '✅ Ativado' ELSE '❌ Não ativado' END
)
SELECT 
  categoria,
  item,
  status
FROM verificacoes
ORDER BY 
  CASE categoria
    WHEN 'Tabelas' THEN 1
    WHEN 'Colunas movimentacoes' THEN 2
    WHEN 'Colunas ferramentas' THEN 3
    WHEN 'RLS' THEN 4
    ELSE 5
  END,
  item;

