-- ============================================================================
-- SOLUÇÃO TEMPORÁRIA: Desabilitar trigger que causa erro
-- Execute isso no Supabase SQL Editor
-- ============================================================================

-- Ver todos os triggers em ferramentas
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid  
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'ferramentas'
AND t.tgisinternal = false;

-- Desabilitar trigger de eventos (se existir)
DO $$
BEGIN
    -- Tentar desabilitar cada trigger possível
    EXECUTE 'ALTER TABLE public.ferramentas DISABLE TRIGGER ALL';
    RAISE NOTICE 'Todos os triggers desabilitados em ferramentas';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao desabilitar triggers: %', SQLERRM;
END $$;

-- Verificar se funcionou
SELECT 
    t.tgname AS trigger_name,
    t.tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'ferramentas'
AND t.tgisinternal = false;
