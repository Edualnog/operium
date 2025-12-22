-- Migration: 054_teams_observability_integration.sql
-- Description: Integrar módulo de Equipes com sistema de observabilidade
-- Author: AI Assistant
-- Date: 2024-12-22
-- ============================================================================

-- ============================================================================
-- 1. ATUALIZAR VIEW analytics.events_log PARA INCLUIR EVENTOS DE EQUIPES
-- ============================================================================

-- Recriar a view incluindo eventos de equipes
CREATE OR REPLACE VIEW analytics.events_log AS
SELECT
    m.id::text AS event_id,
    m.profile_id,
    m.data AS timestamp,
    'movimentacao' AS category,
    m.tipo AS action,
    m.colaborador_id AS actor_id,
    m.ferramenta_id AS object_id,
    jsonb_build_object(
        'quantity', m.quantidade,
        'obs', m.observacoes,
        'source_table', 'movimentacoes'
    ) AS context,
    CASE 
        WHEN m.tipo = 'ajuste' THEN 'CORRECTION' 
        ELSE 'OPERATION' 
    END AS signal_type
FROM public.movimentacoes m

UNION ALL

SELECT
    c.id::text,
    c.profile_id,
    COALESCE(c.data_envio, NOW()) AS timestamp,
    'conserto',
    c.status,
    NULL AS actor_id,
    c.ferramenta_id AS object_id,
    jsonb_build_object(
        'cost', c.custo,
        'description', c.descricao,
        'return_date', c.data_retorno,
        'source_table', 'consertos'
    ),
    CASE 
        WHEN c.custo > 0 THEN 'DEGRADATION'
        ELSE 'MAINTENANCE' 
    END
FROM public.consertos c

UNION ALL

SELECT
    ia.id::text,
    i.profile_id,
    ia.data_ajuste AS timestamp,
    'inventario',
    ia.motivo,
    NULL AS actor_id,
    ii.ferramenta_id AS object_id,
    jsonb_build_object(
        'qty_old', ia.quantidade_anterior,
        'qty_new', ia.quantidade_nova,
        'diff', ia.diferenca,
        'approved_by', ia.aprovado_por,
        'inventory_id', i.id,
        'source_table', 'inventario_ajustes'
    ),
    'DIVERGENCE'
FROM public.inventario_ajustes ia
JOIN public.inventario_itens ii ON ia.inventario_item_id = ii.id
JOIN public.inventarios i ON ii.inventario_id = i.id

UNION ALL

SELECT
    t.id::text,
    t.profile_id,
    t.data_assinatura AS timestamp,
    'legal',
    CONCAT('termo_', t.tipo),
    t.colaborador_id AS actor_id,
    t.movimentacao_id AS object_id,
    jsonb_build_object(
        'signed', (t.assinatura_url IS NOT NULL OR t.assinatura_base64 IS NOT NULL),
        'item_count', jsonb_array_length(t.itens),
        'source_table', 'termos_responsabilidade'
    ),
    'COMPLIANCE'
FROM public.termos_responsabilidade t

-- NOVO: Eventos de Equipes
UNION ALL

SELECT
    te.id::text,
    tm.profile_id,
    te.created_at AS timestamp,
    'team' AS category,
    'created' AS action,
    te.leader_id AS actor_id,
    te.id AS object_id,
    jsonb_build_object(
        'team_name', te.name,
        'vehicle_id', te.vehicle_id,
        'current_project', te.current_project,
        'current_location', te.current_location,
        'source_table', 'teams'
    ),
    'OPERATION'
FROM public.teams te
JOIN public.profiles tm ON tm.id = te.profile_id

-- Eventos de atribuição de equipamento a equipe
UNION ALL

SELECT
    teq.id::text,
    t.profile_id,
    teq.assigned_at AS timestamp,
    'team_equipment' AS category,
    CASE WHEN teq.returned_at IS NULL THEN 'assigned' ELSE 'returned' END AS action,
    t.leader_id AS actor_id,
    teq.ferramenta_id AS object_id,
    jsonb_build_object(
        'team_id', teq.team_id,
        'team_name', t.name,
        'quantity', teq.quantity,
        'returned_at', teq.returned_at,
        'source_table', 'team_equipment'
    ),
    'OPERATION'
FROM public.team_equipment teq
JOIN public.teams t ON t.id = teq.team_id

-- Eventos de membros de equipe
UNION ALL

SELECT
    tmem.id::text,
    t.profile_id,
    tmem.joined_at AS timestamp,
    'team_member' AS category,
    CASE WHEN tmem.left_at IS NULL THEN 'joined' ELSE 'left' END AS action,
    tmem.colaborador_id AS actor_id,
    tmem.team_id AS object_id,
    jsonb_build_object(
        'team_id', tmem.team_id,
        'team_name', t.name,
        'role', tmem.role,
        'left_at', tmem.left_at,
        'source_table', 'team_members'
    ),
    'OPERATION'
FROM public.team_members tmem
JOIN public.teams t ON t.id = tmem.team_id

-- Eventos de obras/serviços de equipe
UNION ALL

SELECT
    ta.id::text,
    t.profile_id,
    ta.started_at AS timestamp,
    'team_assignment' AS category,
    CASE WHEN ta.ended_at IS NULL THEN 'started' ELSE 'completed' END AS action,
    t.leader_id AS actor_id,
    ta.team_id AS object_id,
    jsonb_build_object(
        'team_id', ta.team_id,
        'team_name', t.name,
        'project_name', ta.project_name,
        'location', ta.location,
        'service_type', ta.service_type,
        'ended_at', ta.ended_at,
        'source_table', 'team_assignments'
    ),
    'OPERATION'
FROM public.team_assignments ta
JOIN public.teams t ON t.id = ta.team_id;

-- Comentário atualizado
COMMENT ON VIEW analytics.events_log IS 
'Stream unificado de eventos operacionais incluindo equipes. 
Categorias: movimentacao, conserto, inventario, legal, team, team_equipment, team_member, team_assignment.
Signal types: OPERATION, CORRECTION, DEGRADATION, DIVERGENCE, COMPLIANCE.';

-- ============================================================================
-- 2. ADICIONAR EQUIPE AO entity_type DO domain_events
-- ============================================================================

-- Alterar constraint para incluir 'team'
ALTER TABLE public.domain_events 
DROP CONSTRAINT IF EXISTS domain_events_entity_type_check;

ALTER TABLE public.domain_events 
ADD CONSTRAINT domain_events_entity_type_check 
CHECK (entity_type = ANY (ARRAY[
    'tool', 'asset', 'vehicle', 'collaborator', 'inventory', 
    'product', 'movement', 'repair', 'maintenance', 'cost', 
    'generic', 'team', 'team_equipment', 'team_member', 'team_assignment'
]));

-- ============================================================================
-- 3. FUNÇÃO PARA EMITIR EVENTO DE EQUIPE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_emit_team_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.domain_events (
        profile_id,
        entity_type,
        entity_id,
        event_type,
        event_source,
        payload,
        occurred_at
    ) VALUES (
        NEW.profile_id,
        'team',
        NEW.id,
        CASE TG_OP 
            WHEN 'INSERT' THEN 'CREATED'
            WHEN 'UPDATE' THEN 'UPDATED'
            ELSE 'UNKNOWN'
        END,
        'system',
        jsonb_build_object(
            'name', NEW.name,
            'leader_id', NEW.leader_id,
            'vehicle_id', NEW.vehicle_id,
            'status', NEW.status,
            'current_project', NEW.current_project,
            'current_location', NEW.current_location
        ),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para emitir evento na criação/atualização de equipe
DROP TRIGGER IF EXISTS trg_emit_team_event ON public.teams;
CREATE TRIGGER trg_emit_team_event
    AFTER INSERT OR UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_emit_team_event();

-- ============================================================================
-- 4. FUNÇÃO PARA EMITIR EVENTO DE EQUIPAMENTO DE EQUIPE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_emit_team_equipment_event()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Buscar profile_id da equipe
    SELECT profile_id INTO v_profile_id FROM public.teams WHERE id = NEW.team_id;
    
    INSERT INTO public.domain_events (
        profile_id,
        entity_type,
        entity_id,
        event_type,
        event_source,
        payload,
        occurred_at
    ) VALUES (
        v_profile_id,
        'team_equipment',
        NEW.id,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'ASSIGNED'
            WHEN NEW.returned_at IS NOT NULL AND (OLD.returned_at IS NULL OR TG_OP = 'INSERT') THEN 'RETURNED'
            ELSE 'UPDATED'
        END,
        'system',
        jsonb_build_object(
            'team_id', NEW.team_id,
            'ferramenta_id', NEW.ferramenta_id,
            'quantity', NEW.quantity,
            'returned_at', NEW.returned_at
        ),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para emitir evento
DROP TRIGGER IF EXISTS trg_emit_team_equipment_event ON public.team_equipment;
CREATE TRIGGER trg_emit_team_equipment_event
    AFTER INSERT OR UPDATE ON public.team_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_emit_team_equipment_event();

COMMENT ON FUNCTION public.fn_emit_team_event IS 
'Emite evento no domain_events quando uma equipe é criada ou atualizada.';

COMMENT ON FUNCTION public.fn_emit_team_equipment_event IS 
'Emite evento no domain_events quando equipamento é atribuído ou devolvido de equipe.';
