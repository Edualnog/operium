-- ============================================================================
-- REMOÇÃO COMPLETA DE TRIGGERS PROBLEMÁTICOS EM TODAS AS TABELAS RELACIONADAS
-- Execute este script COMPLETO no SQL Editor do Supabase
-- ============================================================================

-- ============================================================================
-- 1. LISTAR TODOS OS TRIGGERS DE TODAS AS TABELAS RELEVANTES
-- ============================================================================
SELECT 
    c.relname AS table_name,
    t.tgname AS trigger_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN (
    'ferramentas', 'movimentacoes', 'consertos', 
    'colaboradores', 'domain_events', 'teams',
    'team_equipment', 'team_members', 'vehicles'
)
AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- 2. REMOVER TRIGGERS PROBLEMÁTICOS DE TODAS AS TABELAS
-- ============================================================================

-- FERRAMENTAS
DROP TRIGGER IF EXISTS trg_enforce_event_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS ferramentas_broadcast_trigger ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_capture_ferramenta_failure ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_event_policy_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_wiretap_ferramentas ON public.ferramentas;
DROP TRIGGER IF EXISTS trg_ferramenta_updated ON public.ferramentas;
DROP TRIGGER IF EXISTS on_ferramenta_change ON public.ferramentas;

-- MOVIMENTACOES
DROP TRIGGER IF EXISTS trg_enforce_event_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS movimentacoes_broadcast_trigger ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_capture_movimentacao_failure ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_event_policy_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS trg_wiretap_movimentacoes ON public.movimentacoes;
DROP TRIGGER IF EXISTS on_movimentacao_change ON public.movimentacoes;

-- CONSERTOS
DROP TRIGGER IF EXISTS trg_enforce_event_consertos ON public.consertos;
DROP TRIGGER IF EXISTS consertos_broadcast_trigger ON public.consertos;
DROP TRIGGER IF EXISTS trg_capture_conserto_failure ON public.consertos;
DROP TRIGGER IF EXISTS trg_event_policy_consertos ON public.consertos;
DROP TRIGGER IF EXISTS trg_wiretap_consertos ON public.consertos;
DROP TRIGGER IF EXISTS on_conserto_change ON public.consertos;

-- COLABORADORES
DROP TRIGGER IF EXISTS trg_enforce_event_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS colaboradores_broadcast_trigger ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_event_policy_colaboradores ON public.colaboradores;
DROP TRIGGER IF EXISTS trg_wiretap_colaboradores ON public.colaboradores;

-- TEAMS
DROP TRIGGER IF EXISTS trg_enforce_event_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_event_policy_teams ON public.teams;
DROP TRIGGER IF EXISTS trg_wiretap_teams ON public.teams;

-- TEAM_EQUIPMENT
DROP TRIGGER IF EXISTS trg_enforce_event_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_event_policy_team_equipment ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_wiretap_team_equipment ON public.team_equipment;

-- TEAM_MEMBERS
DROP TRIGGER IF EXISTS trg_enforce_event_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_event_policy_team_members ON public.team_members;
DROP TRIGGER IF EXISTS trg_wiretap_team_members ON public.team_members;

-- VEHICLES
DROP TRIGGER IF EXISTS trg_enforce_event_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_event_policy_vehicles ON public.vehicles;
DROP TRIGGER IF EXISTS trg_wiretap_vehicles ON public.vehicles;

-- DOMAIN_EVENTS
DROP TRIGGER IF EXISTS trg_auto_event_context ON public.domain_events;
DROP TRIGGER IF EXISTS trg_event_context_auto ON public.domain_events;

-- ============================================================================
-- 3. REMOVER TRIGGERS EM LOOP PARA NÃO DEIXAR ESCAPAR NENHUM
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    tables TEXT[] := ARRAY[
        'ferramentas', 'movimentacoes', 'consertos', 
        'colaboradores', 'domain_events', 'teams',
        'team_equipment', 'team_members', 'vehicles',
        'inventarios', 'inventario_itens', 'inventario_ajustes',
        'vehicle_maintenances', 'vehicle_costs', 'vehicle_usage_events',
        'equipment_issues', 'equipment_notifications', 'assets'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        FOR r IN 
            SELECT tg.tgname, c.relname
            FROM pg_trigger tg
            JOIN pg_class c ON tg.tgrelid = c.oid
            WHERE c.relname = t 
            AND NOT tg.tgisinternal
            AND tg.tgname LIKE 'trg_%'
        LOOP
            BEGIN
                EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.tgname, r.relname);
                RAISE NOTICE 'Removido: %.%', r.relname, r.tgname;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao remover %.%: %', r.relname, r.tgname, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END;
$$;

-- ============================================================================
-- 4. VERIFICAR SE AINDA HÁ TRIGGERS PROBLEMÁTICOS
-- ============================================================================
SELECT 
    c.relname AS table_name,
    t.tgname AS trigger_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN (
    'ferramentas', 'movimentacoes', 'consertos', 
    'colaboradores', 'domain_events', 'teams',
    'team_equipment', 'team_members', 'vehicles'
)
AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- APÓS EXECUTAR, A QUERY ACIMA DEVE RETORNAR VAZIO OU APENAS TRIGGERS ESSENCIAIS
-- ============================================================================
