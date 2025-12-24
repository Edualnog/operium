-- ============================================================================
-- Migration: 108_fix_observer_rls_policies.sql
-- Description: Corrige RLS policies para permitir observers funcionarem
-- Author: AI Assistant
-- Date: 2024-12-24
-- ============================================================================

-- ============================================================================
-- PARTE 1: HABILITAR RLS NAS TABELAS (corrigir linter warning)
-- ============================================================================

-- RLS já está habilitado, mas vamos garantir
ALTER TABLE public.derived_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observer_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observer_state ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 2: CORRIGIR POLICIES PARA PERMITIR FUNÇÕES SECURITY DEFINER
-- ============================================================================

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Anyone can read event types catalog" ON public.derived_event_types;
DROP POLICY IF EXISTS "Users can view own observer logs" ON public.observer_execution_log;
DROP POLICY IF EXISTS "Users can view own observer state" ON public.observer_state;
DROP POLICY IF EXISTS "System can manage observer state" ON public.observer_state;
DROP POLICY IF EXISTS "Users can view own execution logs" ON public.observer_execution_log;
DROP POLICY IF EXISTS "Allow insert via security definer functions" ON public.observer_execution_log;
DROP POLICY IF EXISTS "Allow all via security definer functions" ON public.observer_state;

-- Nova policy: permitir leitura de catálogo para todos
CREATE POLICY "derived_event_types_read_all"
    ON public.derived_event_types
    FOR SELECT
    USING (true);

-- observer_execution_log: Permitir INSERT via funções + SELECT próprio profile
CREATE POLICY "observer_execution_log_insert_all"
    ON public.observer_execution_log
    FOR INSERT
    WITH CHECK (true);  -- Permitir insert de qualquer fonte (função SECURITY DEFINER)

CREATE POLICY "observer_execution_log_select_own"
    ON public.observer_execution_log
    FOR SELECT
    USING (profile_id = auth.uid());

-- observer_state: Permitir tudo via funções
CREATE POLICY "observer_state_all"
    ON public.observer_state
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- PARTE 3: PERMITIR QUE AUTHENTICATED USERS VEJAM TUDO (opcional)
-- ============================================================================

-- Se quiser que usuários autenticados vejam seus próprios dados
GRANT SELECT ON public.derived_event_types TO authenticated;
GRANT SELECT ON public.observer_execution_log TO authenticated;
GRANT SELECT ON public.observer_state TO authenticated;

-- ============================================================================
-- PARTE 4: COMENTÁRIOS DE GOVERNANÇA
-- ============================================================================

COMMENT ON POLICY "derived_event_types_read_all" ON public.derived_event_types IS
'Catálogo de eventos derivados é público para leitura. Apenas sistema pode modificar via migrations.';

COMMENT ON POLICY "observer_execution_log_insert_all" ON public.observer_execution_log IS
'Permite que funções SECURITY DEFINER (observers) insiram logs sem contexto de usuário autenticado.';

COMMENT ON POLICY "observer_execution_log_select_own" ON public.observer_execution_log IS
'Usuários podem ver logs de execução apenas do próprio profile_id.';

COMMENT ON POLICY "observer_state_all" ON public.observer_state IS
'Permite que funções SECURITY DEFINER gerenciem estado dos observers (watermarks).';

-- ============================================================================
-- PARTE 5: FIX SEARCH_PATH WARNING  
-- ============================================================================

-- Adicionar SET search_path à função que foi criada na migration 107
-- Não precisamos recriar toda a função, apenas adicionar o search_path
ALTER FUNCTION analytics.calculate_collaborator_scores() SET search_path = public, analytics;

COMMENT ON FUNCTION analytics.calculate_collaborator_scores IS 
'Recalcula scores comportamentais para todos os colaboradores.
VERSÃO 2: Integra eventos derivados (padrões de atraso, fricção, desvios).
Executar via job agendado.
SECURITY: search_path fixado para prevenir ataques de search_path.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
