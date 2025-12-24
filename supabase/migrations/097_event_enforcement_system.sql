-- ============================================================================
-- OPERIUM: SISTEMA DE ENFORCEMENT DE EVENTOS (EVENT SOURCING LEVE)
-- ============================================================================
-- Versão: 1.0.0
-- Data: 2024-12-24
-- Objetivo: Garantir coleta END-TO-END de eventos, auditável e mensurável
-- ============================================================================

-- ============================================================================
-- PARTE 0: ATUALIZAÇÃO DAS CONSTRAINTS EXISTENTES (COMPATIBILIDADE)
-- ============================================================================
-- Necessário para permitir novos valores de event_source e entity_type

-- Adicionar 'trigger', 'api' e 'system' às constraints de domain_events
-- Primeiro, remover a constraint antiga e criar uma nova

-- 0.1 Atualizar constraint de event_source para incluir 'trigger' e 'api'
ALTER TABLE domain_events DROP CONSTRAINT IF EXISTS domain_events_event_source_check;
ALTER TABLE domain_events ADD CONSTRAINT domain_events_event_source_check
    CHECK (event_source = ANY (ARRAY[
        'system'::text, 'user'::text, 'automation'::text,
        'import'::text, 'migration'::text, 'trigger'::text, 'api'::text
    ]));

-- 0.2 Atualizar constraint de entity_type para incluir 'system'
ALTER TABLE domain_events DROP CONSTRAINT IF EXISTS domain_events_entity_type_check;
ALTER TABLE domain_events ADD CONSTRAINT domain_events_entity_type_check
    CHECK (entity_type = ANY (ARRAY[
        'tool'::text, 'asset'::text, 'vehicle'::text, 'collaborator'::text,
        'inventory'::text, 'product'::text, 'movement'::text, 'repair'::text,
        'maintenance'::text, 'cost'::text, 'generic'::text, 'team'::text,
        'team_equipment'::text, 'team_member'::text, 'team_assignment'::text,
        'movimentacoes'::text, 'system'::text
    ]));

-- 0.3 Limpar TODAS as funções antigas independente da assinatura
-- Isso evita erro de "function name is not unique"
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Dropa TODAS as versões de fn_emit_domain_event
    FOR r IN
        SELECT oid::regprocedure as func_signature
        FROM pg_proc
        WHERE proname = 'fn_emit_domain_event'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;

    -- Dropa outras funções do sistema de eventos
    FOR r IN
        SELECT oid::regprocedure as func_signature
        FROM pg_proc
        WHERE proname IN (
            'fn_calculate_changed_fields',
            'fn_generic_event_trigger',
            'fn_auto_event_context',
            'fn_detect_missing_events',
            'fn_calculate_event_coverage',
            'fn_event_pipeline_health_check',
            'fn_backfill_missing_events'
        )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END;
$$;

-- ============================================================================
-- PARTE 1: TABELA DE POLÍTICA DE EVENTOS (FONTE DA VERDADE)
-- ============================================================================
-- Define explicitamente quais tabelas geram quais eventos

CREATE TABLE IF NOT EXISTS event_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    entity_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    payload_template JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_table, operation)
);

-- Índice para consulta rápida
CREATE INDEX IF NOT EXISTS idx_event_policy_table ON event_policy(source_table);
CREATE INDEX IF NOT EXISTS idx_event_policy_enabled ON event_policy(is_enabled) WHERE is_enabled = TRUE;

-- Comentário da tabela
COMMENT ON TABLE event_policy IS 'Política canônica de eventos: define quais ações em quais tabelas geram quais eventos. Esta é a FONTE DA VERDADE para auditoria.';

-- ============================================================================
-- PARTE 2: POPULAR POLÍTICA DE EVENTOS
-- ============================================================================

INSERT INTO event_policy (source_table, operation, entity_type, event_type, description) VALUES
-- FERRAMENTAS (assets/tools)
('ferramentas', 'INSERT', 'tool', 'TOOL_CREATED', 'Nova ferramenta cadastrada no sistema'),
('ferramentas', 'UPDATE', 'tool', 'TOOL_UPDATED', 'Ferramenta teve dados alterados'),
('ferramentas', 'DELETE', 'tool', 'TOOL_DELETED', 'Ferramenta removida do sistema'),

-- MOVIMENTAÇÕES
('movimentacoes', 'INSERT', 'movement', 'MOVEMENT_CREATED', 'Nova movimentação registrada'),
('movimentacoes', 'UPDATE', 'movement', 'MOVEMENT_UPDATED', 'Movimentação alterada (ex: devolução)'),
('movimentacoes', 'DELETE', 'movement', 'MOVEMENT_DELETED', 'Movimentação removida'),

-- CONSERTOS
('consertos', 'INSERT', 'repair', 'REPAIR_CREATED', 'Novo conserto registrado'),
('consertos', 'UPDATE', 'repair', 'REPAIR_UPDATED', 'Conserto atualizado (status/custo)'),
('consertos', 'DELETE', 'repair', 'REPAIR_DELETED', 'Conserto removido'),

-- INVENTÁRIOS
('inventarios', 'INSERT', 'inventory', 'INVENTORY_CREATED', 'Nova campanha de inventário iniciada'),
('inventarios', 'UPDATE', 'inventory', 'INVENTORY_UPDATED', 'Inventário atualizado'),
('inventarios', 'DELETE', 'inventory', 'INVENTORY_DELETED', 'Inventário removido'),

-- INVENTÁRIO ITENS
('inventario_itens', 'INSERT', 'inventory', 'INVENTORY_ITEM_ADDED', 'Item adicionado ao inventário'),
('inventario_itens', 'UPDATE', 'inventory', 'INVENTORY_ITEM_COUNTED', 'Item contado no inventário'),
('inventario_itens', 'DELETE', 'inventory', 'INVENTORY_ITEM_REMOVED', 'Item removido do inventário'),

-- INVENTÁRIO AJUSTES
('inventario_ajustes', 'INSERT', 'inventory', 'INVENTORY_ADJUSTMENT_CREATED', 'Ajuste de inventário criado'),
('inventario_ajustes', 'UPDATE', 'inventory', 'INVENTORY_ADJUSTMENT_UPDATED', 'Ajuste de inventário modificado'),
('inventario_ajustes', 'DELETE', 'inventory', 'INVENTORY_ADJUSTMENT_DELETED', 'Ajuste de inventário removido'),

-- EQUIPES (TEAMS)
('teams', 'INSERT', 'team', 'TEAM_CREATED', 'Nova equipe criada'),
('teams', 'UPDATE', 'team', 'TEAM_UPDATED', 'Equipe atualizada'),
('teams', 'DELETE', 'team', 'TEAM_DELETED', 'Equipe removida'),

-- MEMBROS DE EQUIPE
('team_members', 'INSERT', 'team', 'TEAM_MEMBER_ADDED', 'Membro adicionado à equipe'),
('team_members', 'UPDATE', 'team', 'TEAM_MEMBER_UPDATED', 'Membro da equipe atualizado'),
('team_members', 'DELETE', 'team', 'TEAM_MEMBER_REMOVED', 'Membro removido da equipe'),

-- EQUIPAMENTOS DE EQUIPE
('team_equipment', 'INSERT', 'team', 'TEAM_EQUIPMENT_ASSIGNED', 'Equipamento atribuído à equipe'),
('team_equipment', 'UPDATE', 'team', 'TEAM_EQUIPMENT_UPDATED', 'Equipamento de equipe atualizado'),
('team_equipment', 'DELETE', 'team', 'TEAM_EQUIPMENT_REMOVED', 'Equipamento removido da equipe'),

-- ATRIBUIÇÕES DE EQUIPE
('team_assignments', 'INSERT', 'team', 'TEAM_ASSIGNMENT_STARTED', 'Equipe iniciou nova obra/serviço'),
('team_assignments', 'UPDATE', 'team', 'TEAM_ASSIGNMENT_UPDATED', 'Atribuição de equipe atualizada'),
('team_assignments', 'DELETE', 'team', 'TEAM_ASSIGNMENT_DELETED', 'Atribuição de equipe removida'),

-- VEÍCULOS
('vehicles', 'INSERT', 'vehicle', 'VEHICLE_CREATED', 'Novo veículo cadastrado'),
('vehicles', 'UPDATE', 'vehicle', 'VEHICLE_UPDATED', 'Veículo atualizado'),
('vehicles', 'DELETE', 'vehicle', 'VEHICLE_DELETED', 'Veículo removido'),

-- MANUTENÇÕES DE VEÍCULOS
('vehicle_maintenances', 'INSERT', 'maintenance', 'VEHICLE_MAINTENANCE_CREATED', 'Nova manutenção registrada'),
('vehicle_maintenances', 'UPDATE', 'maintenance', 'VEHICLE_MAINTENANCE_UPDATED', 'Manutenção atualizada'),
('vehicle_maintenances', 'DELETE', 'maintenance', 'VEHICLE_MAINTENANCE_DELETED', 'Manutenção removida'),

-- CUSTOS DE VEÍCULOS
('vehicle_costs', 'INSERT', 'cost', 'VEHICLE_COST_CREATED', 'Novo custo de veículo registrado'),
('vehicle_costs', 'UPDATE', 'cost', 'VEHICLE_COST_UPDATED', 'Custo de veículo atualizado'),
('vehicle_costs', 'DELETE', 'cost', 'VEHICLE_COST_DELETED', 'Custo de veículo removido'),

-- EVENTOS DE USO DE VEÍCULOS
('vehicle_usage_events', 'INSERT', 'vehicle', 'VEHICLE_USAGE_CREATED', 'Evento de uso de veículo registrado'),
('vehicle_usage_events', 'UPDATE', 'vehicle', 'VEHICLE_USAGE_UPDATED', 'Evento de uso atualizado'),
('vehicle_usage_events', 'DELETE', 'vehicle', 'VEHICLE_USAGE_DELETED', 'Evento de uso removido'),

-- COLABORADORES
('colaboradores', 'INSERT', 'collaborator', 'COLLABORATOR_CREATED', 'Novo colaborador cadastrado'),
('colaboradores', 'UPDATE', 'collaborator', 'COLLABORATOR_UPDATED', 'Colaborador atualizado'),
('colaboradores', 'DELETE', 'collaborator', 'COLLABORATOR_DELETED', 'Colaborador removido'),

-- PROBLEMAS DE EQUIPAMENTOS
('equipment_issues', 'INSERT', 'tool', 'EQUIPMENT_ISSUE_REPORTED', 'Problema de equipamento reportado'),
('equipment_issues', 'UPDATE', 'tool', 'EQUIPMENT_ISSUE_UPDATED', 'Problema de equipamento atualizado'),
('equipment_issues', 'DELETE', 'tool', 'EQUIPMENT_ISSUE_DELETED', 'Problema de equipamento removido'),

-- NOTIFICAÇÕES DE EQUIPAMENTOS
('equipment_notifications', 'INSERT', 'generic', 'EQUIPMENT_NOTIFICATION_SENT', 'Notificação de equipamento enviada'),
('equipment_notifications', 'UPDATE', 'generic', 'EQUIPMENT_NOTIFICATION_READ', 'Notificação de equipamento lida'),
('equipment_notifications', 'DELETE', 'generic', 'EQUIPMENT_NOTIFICATION_DELETED', 'Notificação de equipamento removida'),

-- ASSETS (usa org_id)
('assets', 'INSERT', 'asset', 'ASSET_CREATED', 'Novo asset cadastrado'),
('assets', 'UPDATE', 'asset', 'ASSET_UPDATED', 'Asset atualizado'),
('assets', 'DELETE', 'asset', 'ASSET_DELETED', 'Asset removido')

ON CONFLICT (source_table, operation) DO UPDATE SET
    entity_type = EXCLUDED.entity_type,
    event_type = EXCLUDED.event_type,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- PARTE 3: FUNÇÃO CENTRAL DE EMISSÃO DE EVENTOS
-- ============================================================================
-- Esta é a ÚNICA função que deve inserir em domain_events
-- Garante validação, logging de erros e rastreabilidade

CREATE OR REPLACE FUNCTION fn_emit_domain_event(
    p_profile_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_event_type TEXT,
    p_event_source TEXT DEFAULT 'trigger',
    p_payload JSONB DEFAULT '{}'::JSONB,
    p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
    -- Lista completa de entity_types permitidos (compatível com constraint do banco)
    v_allowed_entity_types TEXT[] := ARRAY[
        'tool', 'asset', 'vehicle', 'collaborator', 'inventory',
        'product', 'movement', 'repair', 'maintenance', 'cost',
        'generic', 'team', 'system',
        -- Tipos adicionais já existentes no banco
        'team_equipment', 'team_member', 'team_assignment', 'movimentacoes'
    ];
    -- Lista completa de event_sources permitidos (compatível com constraint do banco)
    v_allowed_sources TEXT[] := ARRAY[
        'system', 'user', 'automation', 'import', 'migration', 'trigger', 'api'
    ];
BEGIN
    -- ========================================
    -- VALIDAÇÃO 1: profile_id obrigatório
    -- ========================================
    IF p_profile_id IS NULL THEN
        INSERT INTO event_ingestion_errors (
            profile_id, source_table, source_id, event_type,
            error_message, error_detail
        ) VALUES (
            COALESCE(p_profile_id, '00000000-0000-0000-0000-000000000000'::UUID),
            'fn_emit_domain_event',
            p_entity_id,
            p_event_type,
            'profile_id é obrigatório',
            jsonb_build_object(
                'entity_type', p_entity_type,
                'payload', p_payload
            )
        );
        RAISE EXCEPTION 'fn_emit_domain_event: profile_id é obrigatório';
    END IF;

    -- ========================================
    -- VALIDAÇÃO 2: entity_type permitido
    -- ========================================
    IF NOT (p_entity_type = ANY(v_allowed_entity_types)) THEN
        INSERT INTO event_ingestion_errors (
            profile_id, source_table, source_id, event_type,
            error_message, error_detail
        ) VALUES (
            p_profile_id,
            'fn_emit_domain_event',
            p_entity_id,
            p_event_type,
            'entity_type não permitido: ' || p_entity_type,
            jsonb_build_object(
                'provided', p_entity_type,
                'allowed', v_allowed_entity_types,
                'payload', p_payload
            )
        );
        RAISE EXCEPTION 'fn_emit_domain_event: entity_type "%" não permitido', p_entity_type;
    END IF;

    -- ========================================
    -- VALIDAÇÃO 3: event_source permitido
    -- ========================================
    IF NOT (p_event_source = ANY(v_allowed_sources)) THEN
        INSERT INTO event_ingestion_errors (
            profile_id, source_table, source_id, event_type,
            error_message, error_detail
        ) VALUES (
            p_profile_id,
            'fn_emit_domain_event',
            p_entity_id,
            p_event_type,
            'event_source não permitido: ' || p_event_source,
            jsonb_build_object(
                'provided', p_event_source,
                'allowed', v_allowed_sources,
                'payload', p_payload
            )
        );
        RAISE EXCEPTION 'fn_emit_domain_event: event_source "%" não permitido', p_event_source;
    END IF;

    -- ========================================
    -- INSERÇÃO DO EVENTO
    -- ========================================
    BEGIN
        INSERT INTO domain_events (
            profile_id,
            entity_type,
            entity_id,
            event_type,
            event_source,
            payload,
            occurred_at,
            ingested_at
        ) VALUES (
            p_profile_id,
            p_entity_type,
            p_entity_id,
            p_event_type,
            p_event_source,
            p_payload,
            COALESCE(p_occurred_at, NOW()),
            NOW()
        )
        RETURNING id INTO v_event_id;

        RETURN v_event_id;

    EXCEPTION WHEN OTHERS THEN
        -- Log do erro sem falhar silenciosamente
        INSERT INTO event_ingestion_errors (
            profile_id, source_table, source_id, event_type,
            error_message, error_detail, stack_trace
        ) VALUES (
            p_profile_id,
            'fn_emit_domain_event',
            p_entity_id,
            p_event_type,
            SQLERRM,
            jsonb_build_object(
                'entity_type', p_entity_type,
                'event_source', p_event_source,
                'payload', p_payload,
                'sqlstate', SQLSTATE
            ),
            pg_exception_context()
        );

        -- Re-raise para não falhar silenciosamente
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION fn_emit_domain_event IS
'Função central e ÚNICA para emissão de domain_events.
Valida entity_type e event_source, nunca falha silenciosamente,
e loga erros em event_ingestion_errors antes de propagar exceção.';

-- ============================================================================
-- PARTE 4: FUNÇÃO AUXILIAR PARA CALCULAR CAMPOS ALTERADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_calculate_changed_fields(
    p_old JSONB,
    p_new JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_changed JSONB := '{}'::JSONB;
    v_key TEXT;
BEGIN
    -- Itera sobre todas as chaves do novo registro
    FOR v_key IN SELECT jsonb_object_keys(p_new)
    LOOP
        -- Ignora campos de timestamp que sempre mudam
        IF v_key IN ('updated_at', 'created_at', 'ingested_at') THEN
            CONTINUE;
        END IF;

        -- Se o valor mudou, adiciona ao resultado
        IF p_old IS NULL OR
           NOT p_old ? v_key OR
           p_old->v_key IS DISTINCT FROM p_new->v_key THEN
            v_changed := v_changed || jsonb_build_object(
                v_key, jsonb_build_object(
                    'from', CASE WHEN p_old IS NOT NULL AND p_old ? v_key THEN p_old->v_key ELSE NULL END,
                    'to', p_new->v_key
                )
            );
        END IF;
    END LOOP;

    -- Verifica campos que existiam no OLD mas não no NEW (deletados)
    IF p_old IS NOT NULL THEN
        FOR v_key IN SELECT jsonb_object_keys(p_old)
        LOOP
            IF v_key NOT IN ('updated_at', 'created_at', 'ingested_at') AND
               NOT p_new ? v_key THEN
                v_changed := v_changed || jsonb_build_object(
                    v_key, jsonb_build_object(
                        'from', p_old->v_key,
                        'to', NULL
                    )
                );
            END IF;
        END LOOP;
    END IF;

    RETURN v_changed;
END;
$$;

COMMENT ON FUNCTION fn_calculate_changed_fields IS
'Calcula diff entre dois registros JSONB, retornando apenas campos que mudaram com valores before/after.';

-- ============================================================================
-- PARTE 5: FUNÇÃO GENÉRICA DE TRIGGER PARA EMISSÃO DE EVENTOS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_generic_event_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
    v_entity_id UUID;
    v_entity_type TEXT;
    v_event_type TEXT;
    v_payload JSONB;
    v_old_json JSONB;
    v_new_json JSONB;
    v_changed_fields JSONB;
    v_policy RECORD;
    v_operation TEXT;
BEGIN
    -- Determina a operação
    v_operation := TG_OP;

    -- ========================================
    -- BUSCA POLÍTICA DE EVENTO
    -- ========================================
    SELECT * INTO v_policy
    FROM event_policy
    WHERE source_table = TG_TABLE_NAME
      AND operation = v_operation
      AND is_enabled = TRUE;

    -- Se não há política definida ou está desabilitada, não faz nada
    IF NOT FOUND THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- ========================================
    -- EXTRAI profile_id E entity_id
    -- ========================================
    -- Tenta diferentes padrões de nome de coluna
    IF TG_OP = 'DELETE' THEN
        v_old_json := to_jsonb(OLD);
        v_profile_id := COALESCE(
            (v_old_json->>'profile_id')::UUID,
            -- Algumas tabelas usam org_id em vez de profile_id
            (v_old_json->>'org_id')::UUID,
            -- Para tabelas que referenciam outras (como team_members)
            (SELECT t.profile_id FROM teams t WHERE t.id = (v_old_json->>'team_id')::UUID),
            (SELECT i.profile_id FROM inventarios i WHERE i.id = (v_old_json->>'inventario_id')::UUID),
            (SELECT v.profile_id FROM vehicles v WHERE v.id = (v_old_json->>'vehicle_id')::UUID),
            -- Para equipment_issues via team_equipment
            (SELECT t.profile_id FROM teams t
             JOIN team_equipment te ON te.team_id = t.id
             WHERE te.id = (v_old_json->>'team_equipment_id')::UUID)
        );
        v_entity_id := (v_old_json->>'id')::UUID;
    ELSE
        v_new_json := to_jsonb(NEW);
        IF TG_OP = 'UPDATE' THEN
            v_old_json := to_jsonb(OLD);
        END IF;
        v_profile_id := COALESCE(
            (v_new_json->>'profile_id')::UUID,
            -- Algumas tabelas usam org_id em vez de profile_id
            (v_new_json->>'org_id')::UUID,
            (SELECT t.profile_id FROM teams t WHERE t.id = (v_new_json->>'team_id')::UUID),
            (SELECT i.profile_id FROM inventarios i WHERE i.id = (v_new_json->>'inventario_id')::UUID),
            (SELECT v.profile_id FROM vehicles v WHERE v.id = (v_new_json->>'vehicle_id')::UUID),
            (SELECT ii.profile_id FROM inventario_itens ii2
             JOIN inventarios ii ON ii2.inventario_id = ii.id
             WHERE ii2.id = (v_new_json->>'inventario_item_id')::UUID),
            -- Para equipment_issues via team_equipment
            (SELECT t.profile_id FROM teams t
             JOIN team_equipment te ON te.team_id = t.id
             WHERE te.id = (v_new_json->>'team_equipment_id')::UUID)
        );
        v_entity_id := (v_new_json->>'id')::UUID;
    END IF;

    -- Se não conseguiu profile_id, loga erro e retorna
    IF v_profile_id IS NULL THEN
        INSERT INTO event_ingestion_errors (
            profile_id, source_table, source_id, event_type,
            error_message, error_detail
        ) VALUES (
            '00000000-0000-0000-0000-000000000000'::UUID,
            TG_TABLE_NAME,
            v_entity_id,
            v_policy.event_type,
            'Não foi possível determinar profile_id',
            jsonb_build_object(
                'operation', v_operation,
                'record', COALESCE(v_new_json, v_old_json)
            )
        );

        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- ========================================
    -- MONTA PAYLOAD DO EVENTO
    -- ========================================
    v_entity_type := v_policy.entity_type;
    v_event_type := v_policy.event_type;

    -- Calcula campos alterados para UPDATE
    IF TG_OP = 'UPDATE' THEN
        v_changed_fields := fn_calculate_changed_fields(v_old_json, v_new_json);
    ELSE
        v_changed_fields := '{}'::JSONB;
    END IF;

    v_payload := jsonb_build_object(
        'source_table', TG_TABLE_NAME,
        'source_id', v_entity_id,
        'operation', v_operation,
        'before', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN v_old_json ELSE NULL END,
        'after', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN v_new_json ELSE NULL END,
        'changed_fields', v_changed_fields,
        'trigger_name', TG_NAME,
        'trigger_timestamp', NOW()
    );

    -- ========================================
    -- EMITE O EVENTO
    -- ========================================
    PERFORM fn_emit_domain_event(
        v_profile_id,
        v_entity_type,
        v_entity_id,
        v_event_type,
        'trigger',
        v_payload,
        NOW()
    );

    -- Retorna o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro no trigger, loga mas NÃO bloqueia a operação original
    -- Isso é crítico para não quebrar a aplicação
    INSERT INTO event_ingestion_errors (
        profile_id, source_table, source_id, event_type,
        error_message, error_detail, stack_trace
    ) VALUES (
        COALESCE(v_profile_id, '00000000-0000-0000-0000-000000000000'::UUID),
        TG_TABLE_NAME,
        v_entity_id,
        v_policy.event_type,
        'Erro no trigger de evento: ' || SQLERRM,
        jsonb_build_object(
            'operation', v_operation,
            'sqlstate', SQLSTATE,
            'record', COALESCE(v_new_json, v_old_json)
        ),
        pg_exception_context()
    );

    -- Retorna sem bloquear a operação
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION fn_generic_event_trigger IS
'Trigger genérico que consulta event_policy para determinar o tipo de evento a emitir.
Nunca bloqueia a operação original, mesmo em caso de erro (loga em event_ingestion_errors).';

-- ============================================================================
-- PARTE 6: CRIAÇÃO DOS TRIGGERS OBRIGATÓRIOS
-- ============================================================================

-- Remove triggers antigos se existirem (para permitir re-execução)
DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'ferramentas', 'movimentacoes', 'consertos',
        'inventarios', 'inventario_itens', 'inventario_ajustes',
        'teams', 'team_members', 'team_equipment', 'team_assignments',
        'vehicles', 'vehicle_maintenances', 'vehicle_costs', 'vehicle_usage_events',
        'colaboradores'
    ];
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY v_tables
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_event_%s ON %I', v_table, v_table);
    END LOOP;
END;
$$;

-- FERRAMENTAS
CREATE TRIGGER trg_enforce_event_ferramentas
    AFTER INSERT OR UPDATE OR DELETE ON ferramentas
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- MOVIMENTAÇÕES
CREATE TRIGGER trg_enforce_event_movimentacoes
    AFTER INSERT OR UPDATE OR DELETE ON movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- CONSERTOS
CREATE TRIGGER trg_enforce_event_consertos
    AFTER INSERT OR UPDATE OR DELETE ON consertos
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- INVENTÁRIOS
CREATE TRIGGER trg_enforce_event_inventarios
    AFTER INSERT OR UPDATE OR DELETE ON inventarios
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- INVENTÁRIO ITENS
CREATE TRIGGER trg_enforce_event_inventario_itens
    AFTER INSERT OR UPDATE OR DELETE ON inventario_itens
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- INVENTÁRIO AJUSTES
CREATE TRIGGER trg_enforce_event_inventario_ajustes
    AFTER INSERT OR UPDATE OR DELETE ON inventario_ajustes
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- TEAMS
CREATE TRIGGER trg_enforce_event_teams
    AFTER INSERT OR UPDATE OR DELETE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- TEAM MEMBERS
CREATE TRIGGER trg_enforce_event_team_members
    AFTER INSERT OR UPDATE OR DELETE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- TEAM EQUIPMENT
CREATE TRIGGER trg_enforce_event_team_equipment
    AFTER INSERT OR UPDATE OR DELETE ON team_equipment
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- TEAM ASSIGNMENTS
CREATE TRIGGER trg_enforce_event_team_assignments
    AFTER INSERT OR UPDATE OR DELETE ON team_assignments
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- VEHICLES
CREATE TRIGGER trg_enforce_event_vehicles
    AFTER INSERT OR UPDATE OR DELETE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- VEHICLE MAINTENANCES
CREATE TRIGGER trg_enforce_event_vehicle_maintenances
    AFTER INSERT OR UPDATE OR DELETE ON vehicle_maintenances
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- VEHICLE COSTS
CREATE TRIGGER trg_enforce_event_vehicle_costs
    AFTER INSERT OR UPDATE OR DELETE ON vehicle_costs
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- VEHICLE USAGE EVENTS
CREATE TRIGGER trg_enforce_event_vehicle_usage_events
    AFTER INSERT OR UPDATE OR DELETE ON vehicle_usage_events
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- COLABORADORES
CREATE TRIGGER trg_enforce_event_colaboradores
    AFTER INSERT OR UPDATE OR DELETE ON colaboradores
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();

-- EQUIPMENT ISSUES (usa org_id em vez de profile_id)
-- Só cria se a tabela existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_issues') THEN
        DROP TRIGGER IF EXISTS trg_enforce_event_equipment_issues ON equipment_issues;
        CREATE TRIGGER trg_enforce_event_equipment_issues
            AFTER INSERT OR UPDATE OR DELETE ON equipment_issues
            FOR EACH ROW
            EXECUTE FUNCTION fn_generic_event_trigger();
    END IF;
END;
$$;

-- EQUIPMENT NOTIFICATIONS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_notifications') THEN
        DROP TRIGGER IF EXISTS trg_enforce_event_equipment_notifications ON equipment_notifications;
        CREATE TRIGGER trg_enforce_event_equipment_notifications
            AFTER INSERT OR UPDATE OR DELETE ON equipment_notifications
            FOR EACH ROW
            EXECUTE FUNCTION fn_generic_event_trigger();
    END IF;
END;
$$;

-- ASSETS (usa org_id em vez de profile_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
        DROP TRIGGER IF EXISTS trg_enforce_event_assets ON assets;
        CREATE TRIGGER trg_enforce_event_assets
            AFTER INSERT OR UPDATE OR DELETE ON assets
            FOR EACH ROW
            EXECUTE FUNCTION fn_generic_event_trigger();
    END IF;
END;
$$;

-- ============================================================================
-- PARTE 7: TRIGGER PARA GERAÇÃO AUTOMÁTICA DE EVENT_CONTEXT
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_auto_event_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shift TEXT;
    v_hour INTEGER;
    v_day_of_week INTEGER;
BEGIN
    -- Determina o turno baseado no horário
    v_hour := EXTRACT(HOUR FROM NEW.occurred_at);
    v_day_of_week := EXTRACT(DOW FROM NEW.occurred_at);

    -- Lógica de turno
    IF v_day_of_week IN (0, 6) THEN
        v_shift := 'weekend';
    ELSIF v_hour >= 6 AND v_hour < 18 THEN
        v_shift := 'day';
    ELSE
        v_shift := 'night';
    END IF;

    -- Insere contexto padrão
    INSERT INTO event_context (
        event_id,
        shift,
        urgency_level,
        operational_pressure,
        was_outside_process,
        context_metadata,
        created_at
    ) VALUES (
        NEW.id,
        v_shift,
        'medium',
        'normal',
        FALSE,
        jsonb_build_object(
            'auto_generated', TRUE,
            'hour', v_hour,
            'day_of_week', v_day_of_week
        ),
        NOW()
    )
    ON CONFLICT (event_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Loga erro mas não bloqueia
    INSERT INTO event_ingestion_errors (
        profile_id, source_table, source_id, event_type,
        error_message, error_detail
    ) VALUES (
        NEW.profile_id,
        'domain_events',
        NEW.id,
        'EVENT_CONTEXT_AUTO',
        'Erro ao criar event_context automático: ' || SQLERRM,
        jsonb_build_object(
            'event_id', NEW.id,
            'sqlstate', SQLSTATE
        )
    );
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_auto_event_context IS
'Gera automaticamente um event_context para cada novo domain_event,
garantindo que nenhum evento fique sem contexto operacional.';

-- Remove trigger existente se houver
DROP TRIGGER IF EXISTS trg_auto_event_context ON domain_events;

-- Cria trigger
CREATE TRIGGER trg_auto_event_context
    AFTER INSERT ON domain_events
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_event_context();

-- ============================================================================
-- PARTE 8: FUNÇÃO DE DETECÇÃO DE EVENTOS FALTANTES (AUDITORIA)
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_detect_missing_events(
    p_profile_id UUID DEFAULT NULL,
    p_lookback_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    source_table TEXT,
    missing_count BIGINT,
    total_records BIGINT,
    coverage_rate NUMERIC,
    sample_missing_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_table_name TEXT;
    v_total_missing BIGINT := 0;
    v_total_records BIGINT := 0;
    v_coverage_rate NUMERIC;
    v_start_time TIMESTAMPTZ := NOW() - (p_lookback_hours || ' hours')::INTERVAL;
BEGIN
    -- ========================================
    -- FERRAMENTAS
    -- ========================================
    RETURN QUERY
    WITH tool_records AS (
        SELECT f.id, f.profile_id, f.created_at
        FROM ferramentas f
        WHERE (p_profile_id IS NULL OR f.profile_id = p_profile_id)
          AND f.created_at >= v_start_time
    ),
    tool_events AS (
        SELECT (de.payload->>'source_id')::UUID as source_id
        FROM domain_events de
        WHERE de.entity_type = 'tool'
          AND de.event_type LIKE 'TOOL_%'
          AND de.occurred_at >= v_start_time
          AND (p_profile_id IS NULL OR de.profile_id = p_profile_id)
    ),
    missing AS (
        SELECT tr.id
        FROM tool_records tr
        LEFT JOIN tool_events te ON te.source_id = tr.id
        WHERE te.source_id IS NULL
    )
    SELECT
        'ferramentas'::TEXT,
        (SELECT COUNT(*) FROM missing),
        (SELECT COUNT(*) FROM tool_records),
        CASE WHEN (SELECT COUNT(*) FROM tool_records) > 0
             THEN ROUND(100.0 * (1 - (SELECT COUNT(*) FROM missing)::NUMERIC / (SELECT COUNT(*) FROM tool_records)), 2)
             ELSE 100.0
        END,
        (SELECT ARRAY_AGG(id) FROM (SELECT id FROM missing LIMIT 5) s);

    -- ========================================
    -- MOVIMENTAÇÕES
    -- ========================================
    RETURN QUERY
    WITH mov_records AS (
        SELECT m.id, m.profile_id, m.data as created_at
        FROM movimentacoes m
        WHERE (p_profile_id IS NULL OR m.profile_id = p_profile_id)
          AND m.data >= v_start_time
    ),
    mov_events AS (
        SELECT (de.payload->>'source_id')::UUID as source_id
        FROM domain_events de
        WHERE de.entity_type = 'movement'
          AND de.occurred_at >= v_start_time
          AND (p_profile_id IS NULL OR de.profile_id = p_profile_id)
    ),
    missing AS (
        SELECT mr.id
        FROM mov_records mr
        LEFT JOIN mov_events me ON me.source_id = mr.id
        WHERE me.source_id IS NULL
    )
    SELECT
        'movimentacoes'::TEXT,
        (SELECT COUNT(*) FROM missing),
        (SELECT COUNT(*) FROM mov_records),
        CASE WHEN (SELECT COUNT(*) FROM mov_records) > 0
             THEN ROUND(100.0 * (1 - (SELECT COUNT(*) FROM missing)::NUMERIC / (SELECT COUNT(*) FROM mov_records)), 2)
             ELSE 100.0
        END,
        (SELECT ARRAY_AGG(id) FROM (SELECT id FROM missing LIMIT 5) s);

    -- ========================================
    -- VEÍCULOS
    -- ========================================
    RETURN QUERY
    WITH vehicle_records AS (
        SELECT v.id, v.profile_id, v.created_at
        FROM vehicles v
        WHERE (p_profile_id IS NULL OR v.profile_id = p_profile_id)
          AND v.created_at >= v_start_time
    ),
    vehicle_events AS (
        SELECT (de.payload->>'source_id')::UUID as source_id
        FROM domain_events de
        WHERE de.entity_type = 'vehicle'
          AND de.event_type LIKE 'VEHICLE_%'
          AND de.occurred_at >= v_start_time
          AND (p_profile_id IS NULL OR de.profile_id = p_profile_id)
    ),
    missing AS (
        SELECT vr.id
        FROM vehicle_records vr
        LEFT JOIN vehicle_events ve ON ve.source_id = vr.id
        WHERE ve.source_id IS NULL
    )
    SELECT
        'vehicles'::TEXT,
        (SELECT COUNT(*) FROM missing),
        (SELECT COUNT(*) FROM vehicle_records),
        CASE WHEN (SELECT COUNT(*) FROM vehicle_records) > 0
             THEN ROUND(100.0 * (1 - (SELECT COUNT(*) FROM missing)::NUMERIC / (SELECT COUNT(*) FROM vehicle_records)), 2)
             ELSE 100.0
        END,
        (SELECT ARRAY_AGG(id) FROM (SELECT id FROM missing LIMIT 5) s);

    -- ========================================
    -- TEAMS
    -- ========================================
    RETURN QUERY
    WITH team_records AS (
        SELECT t.id, t.profile_id, t.created_at
        FROM teams t
        WHERE (p_profile_id IS NULL OR t.profile_id = p_profile_id)
          AND t.created_at >= v_start_time
    ),
    team_events AS (
        SELECT (de.payload->>'source_id')::UUID as source_id
        FROM domain_events de
        WHERE de.entity_type = 'team'
          AND de.event_type LIKE 'TEAM_%'
          AND de.occurred_at >= v_start_time
          AND (p_profile_id IS NULL OR de.profile_id = p_profile_id)
    ),
    missing AS (
        SELECT tr.id
        FROM team_records tr
        LEFT JOIN team_events te ON te.source_id = tr.id
        WHERE te.source_id IS NULL
    )
    SELECT
        'teams'::TEXT,
        (SELECT COUNT(*) FROM missing),
        (SELECT COUNT(*) FROM team_records),
        CASE WHEN (SELECT COUNT(*) FROM team_records) > 0
             THEN ROUND(100.0 * (1 - (SELECT COUNT(*) FROM missing)::NUMERIC / (SELECT COUNT(*) FROM team_records)), 2)
             ELSE 100.0
        END,
        (SELECT ARRAY_AGG(id) FROM (SELECT id FROM missing LIMIT 5) s);

    -- ========================================
    -- INVENTÁRIOS
    -- ========================================
    RETURN QUERY
    WITH inv_records AS (
        SELECT i.id, i.profile_id, i.created_at
        FROM inventarios i
        WHERE (p_profile_id IS NULL OR i.profile_id = p_profile_id)
          AND i.created_at >= v_start_time
    ),
    inv_events AS (
        SELECT (de.payload->>'source_id')::UUID as source_id
        FROM domain_events de
        WHERE de.entity_type = 'inventory'
          AND de.event_type LIKE 'INVENTORY_%'
          AND de.occurred_at >= v_start_time
          AND (p_profile_id IS NULL OR de.profile_id = p_profile_id)
    ),
    missing AS (
        SELECT ir.id
        FROM inv_records ir
        LEFT JOIN inv_events ie ON ie.source_id = ir.id
        WHERE ie.source_id IS NULL
    )
    SELECT
        'inventarios'::TEXT,
        (SELECT COUNT(*) FROM missing),
        (SELECT COUNT(*) FROM inv_records),
        CASE WHEN (SELECT COUNT(*) FROM inv_records) > 0
             THEN ROUND(100.0 * (1 - (SELECT COUNT(*) FROM missing)::NUMERIC / (SELECT COUNT(*) FROM inv_records)), 2)
             ELSE 100.0
        END,
        (SELECT ARRAY_AGG(id) FROM (SELECT id FROM missing LIMIT 5) s);

    -- ========================================
    -- CONSERTOS
    -- ========================================
    RETURN QUERY
    WITH repair_records AS (
        SELECT c.id, c.profile_id, c.data_envio as created_at
        FROM consertos c
        WHERE (p_profile_id IS NULL OR c.profile_id = p_profile_id)
          AND c.data_envio >= v_start_time
    ),
    repair_events AS (
        SELECT (de.payload->>'source_id')::UUID as source_id
        FROM domain_events de
        WHERE de.entity_type = 'repair'
          AND de.occurred_at >= v_start_time
          AND (p_profile_id IS NULL OR de.profile_id = p_profile_id)
    ),
    missing AS (
        SELECT rr.id
        FROM repair_records rr
        LEFT JOIN repair_events re ON re.source_id = rr.id
        WHERE re.source_id IS NULL
    )
    SELECT
        'consertos'::TEXT,
        (SELECT COUNT(*) FROM missing),
        (SELECT COUNT(*) FROM repair_records),
        CASE WHEN (SELECT COUNT(*) FROM repair_records) > 0
             THEN ROUND(100.0 * (1 - (SELECT COUNT(*) FROM missing)::NUMERIC / (SELECT COUNT(*) FROM repair_records)), 2)
             ELSE 100.0
        END,
        (SELECT ARRAY_AGG(id) FROM (SELECT id FROM missing LIMIT 5) s);

END;
$$;

COMMENT ON FUNCTION fn_detect_missing_events IS
'Detecta registros em tabelas operacionais que não têm eventos correspondentes em domain_events.
Retorna taxa de cobertura por tabela e amostra de IDs faltantes para investigação.';

-- ============================================================================
-- PARTE 9: FUNÇÃO PARA CALCULAR COBERTURA GLOBAL
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_calculate_event_coverage(
    p_profile_id UUID DEFAULT NULL,
    p_lookback_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_records BIGINT,
    total_missing BIGINT,
    coverage_rate NUMERIC,
    tables_below_threshold TEXT[],
    check_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_records BIGINT := 0;
    v_total_missing BIGINT := 0;
    v_below_threshold TEXT[] := ARRAY[]::TEXT[];
    v_row RECORD;
BEGIN
    -- Agrega resultados de todas as tabelas
    FOR v_row IN
        SELECT * FROM fn_detect_missing_events(p_profile_id, p_lookback_hours)
    LOOP
        v_total_records := v_total_records + v_row.total_records;
        v_total_missing := v_total_missing + v_row.missing_count;

        -- Marca tabelas abaixo de 99%
        IF v_row.coverage_rate < 99.0 AND v_row.total_records > 0 THEN
            v_below_threshold := array_append(
                v_below_threshold,
                v_row.source_table || ':' || v_row.coverage_rate || '%'
            );
        END IF;
    END LOOP;

    RETURN QUERY SELECT
        v_total_records,
        v_total_missing,
        CASE WHEN v_total_records > 0
             THEN ROUND(100.0 * (1 - v_total_missing::NUMERIC / v_total_records), 2)
             ELSE 100.0
        END,
        v_below_threshold,
        NOW();
END;
$$;

COMMENT ON FUNCTION fn_calculate_event_coverage IS
'Calcula taxa de cobertura de eventos global agregando todas as tabelas monitoradas.';

-- ============================================================================
-- PARTE 10: HEALTH CHECK DO PIPELINE DE EVENTOS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_event_pipeline_health_check(
    p_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    value NUMERIC,
    threshold NUMERIC,
    message TEXT,
    severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_events_last_hour BIGINT;
    v_errors_last_hour BIGINT;
    v_coverage_rate NUMERIC;
    v_events_without_context BIGINT;
    v_log_id UUID;
    v_start_time TIMESTAMPTZ := NOW();
    v_has_critical BOOLEAN := FALSE;
BEGIN
    -- ========================================
    -- CHECK 1: Eventos por hora
    -- ========================================
    SELECT COUNT(*) INTO v_events_last_hour
    FROM domain_events
    WHERE ingested_at >= NOW() - INTERVAL '1 hour'
      AND (p_profile_id IS NULL OR profile_id = p_profile_id);

    IF v_events_last_hour = 0 THEN
        v_has_critical := TRUE;
    END IF;

    RETURN QUERY SELECT
        'events_per_hour'::TEXT,
        CASE WHEN v_events_last_hour > 0 THEN 'OK' ELSE 'WARNING' END,
        v_events_last_hour::NUMERIC,
        1::NUMERIC,
        CASE WHEN v_events_last_hour > 0
             THEN 'Pipeline ativo: ' || v_events_last_hour || ' eventos na última hora'
             ELSE 'ALERTA: Nenhum evento na última hora - pipeline pode estar inativo'
        END,
        CASE WHEN v_events_last_hour > 0 THEN 'LOW' ELSE 'HIGH' END;

    -- ========================================
    -- CHECK 2: Erros de ingestão
    -- ========================================
    SELECT COUNT(*) INTO v_errors_last_hour
    FROM event_ingestion_errors
    WHERE created_at >= NOW() - INTERVAL '1 hour'
      AND (p_profile_id IS NULL OR profile_id = p_profile_id);

    IF v_errors_last_hour > 10 THEN
        v_has_critical := TRUE;
    END IF;

    RETURN QUERY SELECT
        'ingestion_errors'::TEXT,
        CASE
            WHEN v_errors_last_hour = 0 THEN 'OK'
            WHEN v_errors_last_hour <= 5 THEN 'WARNING'
            ELSE 'CRITICAL'
        END,
        v_errors_last_hour::NUMERIC,
        5::NUMERIC,
        CASE
            WHEN v_errors_last_hour = 0 THEN 'Sem erros de ingestão na última hora'
            ELSE 'ALERTA: ' || v_errors_last_hour || ' erros de ingestão na última hora'
        END,
        CASE
            WHEN v_errors_last_hour = 0 THEN 'LOW'
            WHEN v_errors_last_hour <= 5 THEN 'MEDIUM'
            ELSE 'CRITICAL'
        END;

    -- ========================================
    -- CHECK 3: Cobertura de eventos
    -- ========================================
    SELECT ec.coverage_rate INTO v_coverage_rate
    FROM fn_calculate_event_coverage(p_profile_id, 24) ec;

    IF v_coverage_rate < 99.0 THEN
        v_has_critical := TRUE;
    END IF;

    RETURN QUERY SELECT
        'event_coverage_rate'::TEXT,
        CASE
            WHEN v_coverage_rate >= 99.0 THEN 'OK'
            WHEN v_coverage_rate >= 95.0 THEN 'WARNING'
            ELSE 'CRITICAL'
        END,
        v_coverage_rate,
        99.0::NUMERIC,
        CASE
            WHEN v_coverage_rate >= 99.0 THEN 'Cobertura de eventos: ' || v_coverage_rate || '%'
            ELSE 'ALERTA: Cobertura abaixo do esperado: ' || v_coverage_rate || '%'
        END,
        CASE
            WHEN v_coverage_rate >= 99.0 THEN 'LOW'
            WHEN v_coverage_rate >= 95.0 THEN 'MEDIUM'
            ELSE 'CRITICAL'
        END;

    -- ========================================
    -- CHECK 4: Eventos sem contexto
    -- ========================================
    SELECT COUNT(*) INTO v_events_without_context
    FROM domain_events de
    LEFT JOIN event_context ec ON ec.event_id = de.id
    WHERE ec.id IS NULL
      AND de.ingested_at >= NOW() - INTERVAL '24 hours'
      AND (p_profile_id IS NULL OR de.profile_id = p_profile_id);

    RETURN QUERY SELECT
        'events_without_context'::TEXT,
        CASE
            WHEN v_events_without_context = 0 THEN 'OK'
            WHEN v_events_without_context <= 10 THEN 'WARNING'
            ELSE 'CRITICAL'
        END,
        v_events_without_context::NUMERIC,
        0::NUMERIC,
        CASE
            WHEN v_events_without_context = 0 THEN 'Todos os eventos têm contexto'
            ELSE 'ALERTA: ' || v_events_without_context || ' eventos sem contexto'
        END,
        CASE
            WHEN v_events_without_context = 0 THEN 'LOW'
            WHEN v_events_without_context <= 10 THEN 'MEDIUM'
            ELSE 'HIGH'
        END;

    -- ========================================
    -- REGISTRA EXECUÇÃO NO LOG
    -- ========================================
    INSERT INTO metric_execution_log (
        profile_id,
        metric_key,
        execution_type,
        status,
        started_at,
        finished_at,
        execution_summary,
        triggered_by
    ) VALUES (
        COALESCE(p_profile_id, '00000000-0000-0000-0000-000000000000'::UUID),
        'event_coverage_rate',
        'HEALTH_CHECK',
        CASE WHEN v_has_critical THEN 'ERROR' ELSE 'SUCCESS' END,
        v_start_time,
        NOW(),
        jsonb_build_object(
            'events_last_hour', v_events_last_hour,
            'errors_last_hour', v_errors_last_hour,
            'coverage_rate', v_coverage_rate,
            'events_without_context', v_events_without_context,
            'has_critical', v_has_critical
        ),
        'system'
    )
    RETURNING id INTO v_log_id;

    -- ========================================
    -- GERA ALERTA SE CRÍTICO
    -- ========================================
    IF v_has_critical THEN
        INSERT INTO operational_alerts (
            profile_id,
            metric_key,
            entity_type,
            observed_value,
            expected_min,
            deviation_score,
            severity,
            explanation,
            recommendation,
            context_metadata
        ) VALUES (
            COALESCE(p_profile_id, '00000000-0000-0000-0000-000000000000'::UUID),
            'event_coverage_rate',
            'system',
            v_coverage_rate,
            99.0,
            CASE WHEN v_coverage_rate > 0 THEN (99.0 - v_coverage_rate) / 99.0 * 10 ELSE 10 END,
            'CRITICAL',
            'Pipeline de eventos com problemas críticos. Cobertura: ' || v_coverage_rate ||
            '%, Erros: ' || v_errors_last_hour || ', Eventos s/ contexto: ' || v_events_without_context,
            'Verificar triggers de eventos, logs de erro e integridade do pipeline imediatamente.',
            jsonb_build_object(
                'health_check_log_id', v_log_id,
                'check_timestamp', NOW()
            )
        );
    END IF;

END;
$$;

COMMENT ON FUNCTION fn_event_pipeline_health_check IS
'Executa verificação completa de saúde do pipeline de eventos.
Valida eventos por hora, erros, cobertura e contextos.
Gera alertas CRITICAL automaticamente em caso de falha.';

-- ============================================================================
-- PARTE 11: FUNÇÃO PARA BACKFILL DE EVENTOS FALTANTES
-- ============================================================================
-- Útil para recuperar eventos de registros existentes que foram criados antes dos triggers

CREATE OR REPLACE FUNCTION fn_backfill_missing_events(
    p_profile_id UUID,
    p_source_table TEXT,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    backfilled_count INTEGER,
    error_count INTEGER,
    sample_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_backfilled INTEGER := 0;
    v_errors INTEGER := 0;
    v_sample_ids UUID[] := ARRAY[]::UUID[];
    v_record RECORD;
    v_policy RECORD;
    v_event_id UUID;
BEGIN
    -- Busca política para INSERT (backfill sempre é criação)
    SELECT * INTO v_policy
    FROM event_policy
    WHERE source_table = p_source_table
      AND operation = 'INSERT'
      AND is_enabled = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhuma política de evento encontrada para tabela %', p_source_table;
    END IF;

    -- Processa registros faltantes baseado na tabela
    IF p_source_table = 'ferramentas' THEN
        FOR v_record IN
            SELECT f.*
            FROM ferramentas f
            LEFT JOIN domain_events de ON
                de.profile_id = f.profile_id AND
                (de.payload->>'source_id')::UUID = f.id AND
                de.entity_type = 'tool'
            WHERE f.profile_id = p_profile_id
              AND de.id IS NULL
            LIMIT p_limit
        LOOP
            BEGIN
                v_event_id := fn_emit_domain_event(
                    v_record.profile_id,
                    v_policy.entity_type,
                    v_record.id,
                    v_policy.event_type,
                    'migration',
                    jsonb_build_object(
                        'source_table', p_source_table,
                        'source_id', v_record.id,
                        'operation', 'INSERT',
                        'after', to_jsonb(v_record),
                        'backfilled', TRUE,
                        'backfill_timestamp', NOW()
                    ),
                    v_record.created_at
                );
                v_backfilled := v_backfilled + 1;
                IF array_length(v_sample_ids, 1) IS NULL OR array_length(v_sample_ids, 1) < 5 THEN
                    v_sample_ids := array_append(v_sample_ids, v_record.id);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_errors := v_errors + 1;
            END;
        END LOOP;

    ELSIF p_source_table = 'movimentacoes' THEN
        FOR v_record IN
            SELECT m.*
            FROM movimentacoes m
            LEFT JOIN domain_events de ON
                de.profile_id = m.profile_id AND
                (de.payload->>'source_id')::UUID = m.id AND
                de.entity_type = 'movement'
            WHERE m.profile_id = p_profile_id
              AND de.id IS NULL
            LIMIT p_limit
        LOOP
            BEGIN
                v_event_id := fn_emit_domain_event(
                    v_record.profile_id,
                    v_policy.entity_type,
                    v_record.id,
                    v_policy.event_type,
                    'migration',
                    jsonb_build_object(
                        'source_table', p_source_table,
                        'source_id', v_record.id,
                        'operation', 'INSERT',
                        'after', to_jsonb(v_record),
                        'backfilled', TRUE,
                        'backfill_timestamp', NOW()
                    ),
                    v_record.data
                );
                v_backfilled := v_backfilled + 1;
                IF array_length(v_sample_ids, 1) IS NULL OR array_length(v_sample_ids, 1) < 5 THEN
                    v_sample_ids := array_append(v_sample_ids, v_record.id);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_errors := v_errors + 1;
            END;
        END LOOP;

    ELSIF p_source_table = 'vehicles' THEN
        FOR v_record IN
            SELECT v.*
            FROM vehicles v
            LEFT JOIN domain_events de ON
                de.profile_id = v.profile_id AND
                (de.payload->>'source_id')::UUID = v.id AND
                de.entity_type = 'vehicle'
            WHERE v.profile_id = p_profile_id
              AND de.id IS NULL
            LIMIT p_limit
        LOOP
            BEGIN
                v_event_id := fn_emit_domain_event(
                    v_record.profile_id,
                    v_policy.entity_type,
                    v_record.id,
                    v_policy.event_type,
                    'migration',
                    jsonb_build_object(
                        'source_table', p_source_table,
                        'source_id', v_record.id,
                        'operation', 'INSERT',
                        'after', to_jsonb(v_record),
                        'backfilled', TRUE,
                        'backfill_timestamp', NOW()
                    ),
                    v_record.created_at
                );
                v_backfilled := v_backfilled + 1;
                IF array_length(v_sample_ids, 1) IS NULL OR array_length(v_sample_ids, 1) < 5 THEN
                    v_sample_ids := array_append(v_sample_ids, v_record.id);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_errors := v_errors + 1;
            END;
        END LOOP;

    ELSIF p_source_table = 'teams' THEN
        FOR v_record IN
            SELECT t.*
            FROM teams t
            LEFT JOIN domain_events de ON
                de.profile_id = t.profile_id AND
                (de.payload->>'source_id')::UUID = t.id AND
                de.entity_type = 'team'
            WHERE t.profile_id = p_profile_id
              AND de.id IS NULL
            LIMIT p_limit
        LOOP
            BEGIN
                v_event_id := fn_emit_domain_event(
                    v_record.profile_id,
                    v_policy.entity_type,
                    v_record.id,
                    v_policy.event_type,
                    'migration',
                    jsonb_build_object(
                        'source_table', p_source_table,
                        'source_id', v_record.id,
                        'operation', 'INSERT',
                        'after', to_jsonb(v_record),
                        'backfilled', TRUE,
                        'backfill_timestamp', NOW()
                    ),
                    v_record.created_at
                );
                v_backfilled := v_backfilled + 1;
                IF array_length(v_sample_ids, 1) IS NULL OR array_length(v_sample_ids, 1) < 5 THEN
                    v_sample_ids := array_append(v_sample_ids, v_record.id);
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_errors := v_errors + 1;
            END;
        END LOOP;

    ELSE
        RAISE EXCEPTION 'Tabela % não suportada para backfill', p_source_table;
    END IF;

    RETURN QUERY SELECT v_backfilled, v_errors, v_sample_ids;
END;
$$;

COMMENT ON FUNCTION fn_backfill_missing_events IS
'Cria eventos retroativos para registros existentes que não têm eventos correspondentes.
Útil para migração de dados existentes para o novo sistema de eventos.';

-- ============================================================================
-- PARTE 12: REGISTRAR MÉTRICA DE COBERTURA NO CATÁLOGO
-- ============================================================================

INSERT INTO metric_catalog (
    metric_key,
    entity_type,
    display_name,
    description,
    unit,
    calculation_frequency,
    baseline_required,
    alert_enabled,
    min_sample_size,
    calculation_sql
) VALUES (
    'EVENT_COVERAGE_RATE',
    'system',
    'Taxa de Cobertura de Eventos',
    'Percentual de registros operacionais que têm eventos correspondentes em domain_events. Meta: >= 99%',
    'percent',
    'hourly',
    FALSE,
    TRUE,
    1,
    'SELECT coverage_rate FROM fn_calculate_event_coverage($1, 24)'
)
ON CONFLICT (metric_key) DO UPDATE SET
    description = EXCLUDED.description,
    calculation_sql = EXCLUDED.calculation_sql,
    updated_at = NOW();

-- ============================================================================
-- PARTE 13: VIEW DE STATUS DO SISTEMA DE EVENTOS
-- ============================================================================

CREATE OR REPLACE VIEW v_event_system_status AS
SELECT
    'domain_events' as component,
    (SELECT COUNT(*) FROM domain_events WHERE ingested_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    (SELECT COUNT(*) FROM domain_events WHERE ingested_at >= NOW() - INTERVAL '1 hour') as last_1h_count,
    (SELECT MAX(ingested_at) FROM domain_events) as last_event_at

UNION ALL

SELECT
    'event_context' as component,
    (SELECT COUNT(*) FROM event_context WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    (SELECT COUNT(*) FROM event_context WHERE created_at >= NOW() - INTERVAL '1 hour') as last_1h_count,
    (SELECT MAX(created_at) FROM event_context) as last_event_at

UNION ALL

SELECT
    'event_ingestion_errors' as component,
    (SELECT COUNT(*) FROM event_ingestion_errors WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
    (SELECT COUNT(*) FROM event_ingestion_errors WHERE created_at >= NOW() - INTERVAL '1 hour') as last_1h_count,
    (SELECT MAX(created_at) FROM event_ingestion_errors) as last_event_at;

COMMENT ON VIEW v_event_system_status IS
'Visão rápida do status do sistema de eventos: volumes e últimas atividades.';

-- ============================================================================
-- PARTE 14: VIEW DE POLÍTICAS ATIVAS
-- ============================================================================

CREATE OR REPLACE VIEW v_active_event_policies AS
SELECT
    source_table,
    operation,
    entity_type,
    event_type,
    description,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE c.relname = source_table
              AND t.tgname LIKE 'trg_enforce_event_%'
        ) THEN 'ENFORCED'
        ELSE 'NOT_ENFORCED'
    END as enforcement_status
FROM event_policy
WHERE is_enabled = TRUE
ORDER BY source_table, operation;

COMMENT ON VIEW v_active_event_policies IS
'Lista todas as políticas de eventos ativas e se há triggers de enforcement correspondentes.';

-- ============================================================================
-- FIM DO SCRIPT DE ENFORCEMENT DE EVENTOS
-- ============================================================================
