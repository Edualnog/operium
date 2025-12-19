-- ============================================================================
-- Migration: 046_event_ingestion_infrastructure.sql
-- Description: Infraestrutura completa de ingestão de eventos
-- Author: AI Assistant
-- Date: 2024-12-19
-- 
-- PRINCÍPIOS:
-- 1. domain_events é append-only e imutável
-- 2. Payload deve conter source_table e source_id
-- 3. Triggers são opcionais e controlados por configuração
-- 4. Erros de ingestão nunca bloqueiam operação principal
-- ============================================================================

-- ============================================================================
-- PARTE A: TABELA DE CONFIGURAÇÃO DE INGESTÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_ingestion_config (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    enable_triggers BOOLEAN NOT NULL DEFAULT FALSE,
    enable_movement_events BOOLEAN NOT NULL DEFAULT TRUE,
    enable_repair_events BOOLEAN NOT NULL DEFAULT TRUE,
    enable_inventory_events BOOLEAN NOT NULL DEFAULT TRUE,
    enable_vehicle_events BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.event_ingestion_config IS 
'Configuração de ingestão de eventos por organização.
enable_triggers controla se triggers automáticos capturam eventos.
Por padrão, triggers estão DESABILITADOS para evitar overhead.';

COMMENT ON COLUMN public.event_ingestion_config.enable_triggers IS 'Master switch para todos os triggers de evento';
COMMENT ON COLUMN public.event_ingestion_config.enable_movement_events IS 'Capturar eventos de movimentações';
COMMENT ON COLUMN public.event_ingestion_config.enable_repair_events IS 'Capturar eventos de consertos';
COMMENT ON COLUMN public.event_ingestion_config.enable_inventory_events IS 'Capturar eventos de inventário';
COMMENT ON COLUMN public.event_ingestion_config.enable_vehicle_events IS 'Capturar eventos de veículos';

-- RLS
ALTER TABLE public.event_ingestion_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own config" ON public.event_ingestion_config
    FOR ALL USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PARTE B: TABELA DE ERROS DE INGESTÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_ingestion_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_table TEXT NOT NULL,
    source_id UUID,
    event_type TEXT,
    error_message TEXT NOT NULL,
    error_detail JSONB DEFAULT '{}',
    stack_trace TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_ingestion_errors_profile ON public.event_ingestion_errors(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_ingestion_errors_source ON public.event_ingestion_errors(source_table, created_at DESC);

COMMENT ON TABLE public.event_ingestion_errors IS 
'Log de erros de ingestão de eventos. Erros são registrados aqui sem bloquear operação principal.';

-- RLS
ALTER TABLE public.event_ingestion_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own errors" ON public.event_ingestion_errors
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PARTE C: VIEWS CANÔNICAS (Projeção de dados operacionais para event-like)
-- ============================================================================

-- View: Movimentações -> Eventos
CREATE OR REPLACE VIEW public.v_event_movimentacoes AS
SELECT 
    m.profile_id,
    'movement' AS entity_type,
    m.id AS entity_id,
    CASE m.tipo
        WHEN 'entrada' THEN 'TOOL_MOVEMENT_IN'
        WHEN 'retirada' THEN 'TOOL_MOVEMENT_OUT'
        WHEN 'devolucao' THEN 'TOOL_MOVEMENT_RETURN'
        WHEN 'ajuste' THEN 'TOOL_MOVEMENT_ADJUSTMENT'
        WHEN 'conserto' THEN 'TOOL_MOVEMENT_REPAIR'
        ELSE 'TOOL_MOVEMENT_OTHER'
    END AS event_type,
    'projection' AS event_source,
    jsonb_build_object(
        'source_table', 'movimentacoes',
        'source_id', m.id,
        'tipo', m.tipo,
        'quantidade', m.quantidade,
        'ferramenta_id', m.ferramenta_id,
        'colaborador_id', m.colaborador_id,
        'observacoes', m.observacoes,
        'prazo_devolucao', m.prazo_devolucao
    ) AS payload,
    COALESCE(m.data, m.saida_at, m.devolucao_at) AS occurred_at,
    m.data AS ingested_at,
    'movimentacoes' AS source_table,
    m.id AS source_id
FROM public.movimentacoes m;

ALTER VIEW public.v_event_movimentacoes SET (security_invoker = on);

-- View: Consertos -> Eventos
CREATE OR REPLACE VIEW public.v_event_consertos AS
SELECT 
    c.profile_id,
    'repair' AS entity_type,
    c.id AS entity_id,
    CASE c.status
        WHEN 'aguardando' THEN 'TOOL_REPAIR_CREATED'
        WHEN 'em_andamento' THEN 'TOOL_REPAIR_IN_PROGRESS'
        WHEN 'concluido' THEN 'TOOL_REPAIR_COMPLETED'
        ELSE 'TOOL_REPAIR_STATUS_CHANGED'
    END AS event_type,
    'projection' AS event_source,
    jsonb_build_object(
        'source_table', 'consertos',
        'source_id', c.id,
        'status', c.status,
        'ferramenta_id', c.ferramenta_id,
        'descricao', c.descricao,
        'custo', c.custo,
        'local_conserto', c.local_conserto,
        'prioridade', c.prioridade
    ) AS payload,
    COALESCE(c.data_retorno, c.data_envio) AS occurred_at,
    c.data_envio AS ingested_at,
    'consertos' AS source_table,
    c.id AS source_id
FROM public.consertos c;

ALTER VIEW public.v_event_consertos SET (security_invoker = on);

-- View: Inventários -> Eventos
CREATE OR REPLACE VIEW public.v_event_inventarios AS
SELECT 
    i.profile_id,
    'inventory' AS entity_type,
    i.id AS entity_id,
    CASE i.status
        WHEN 'em_andamento' THEN 'INVENTORY_STARTED'
        WHEN 'finalizado' THEN 'INVENTORY_FINISHED'
        WHEN 'cancelado' THEN 'INVENTORY_CANCELLED'
        ELSE 'INVENTORY_STATUS_CHANGED'
    END AS event_type,
    'projection' AS event_source,
    jsonb_build_object(
        'source_table', 'inventarios',
        'source_id', i.id,
        'status', i.status,
        'descricao', i.descricao,
        'responsavel', i.responsavel,
        'escopo', i.escopo,
        'total_itens', i.total_itens,
        'itens_contados', i.itens_contados,
        'total_divergencias', i.total_divergencias,
        'valor_divergencias', i.valor_divergencias
    ) AS payload,
    COALESCE(i.data_fim, i.data_inicio) AS occurred_at,
    i.created_at AS ingested_at,
    'inventarios' AS source_table,
    i.id AS source_id
FROM public.inventarios i;

ALTER VIEW public.v_event_inventarios SET (security_invoker = on);

-- View: Ajustes de Inventário -> Eventos
CREATE OR REPLACE VIEW public.v_event_inventario_ajustes AS
SELECT 
    inv.profile_id,
    'inventory_adjustment' AS entity_type,
    ia.id AS entity_id,
    'INVENTORY_ADJUSTMENT_CREATED' AS event_type,
    'projection' AS event_source,
    jsonb_build_object(
        'source_table', 'inventario_ajustes',
        'source_id', ia.id,
        'inventario_item_id', ia.inventario_item_id,
        'quantidade_anterior', ia.quantidade_anterior,
        'quantidade_nova', ia.quantidade_nova,
        'diferenca', ia.diferenca,
        'motivo', ia.motivo,
        'observacao', ia.observacao,
        'aprovado_por', ia.aprovado_por,
        'aplicado', ia.aplicado
    ) AS payload,
    ia.data_ajuste AS occurred_at,
    ia.data_ajuste AS ingested_at,
    'inventario_ajustes' AS source_table,
    ia.id AS source_id
FROM public.inventario_ajustes ia
JOIN public.inventario_itens ii ON ii.id = ia.inventario_item_id
JOIN public.inventarios inv ON inv.id = ii.inventario_id;

ALTER VIEW public.v_event_inventario_ajustes SET (security_invoker = on);

-- View: Uso de Veículos -> Eventos
CREATE OR REPLACE VIEW public.v_event_vehicle_usage AS
SELECT 
    v.profile_id,
    'vehicle_usage' AS entity_type,
    vu.id AS entity_id,
    CASE vu.usage_type
        WHEN 'assignment' THEN 'VEHICLE_ASSIGNED'
        WHEN 'return' THEN 'VEHICLE_RETURNED'
        WHEN 'trip' THEN 'VEHICLE_TRIP_RECORDED'
        ELSE 'VEHICLE_USAGE_RECORDED'
    END AS event_type,
    'projection' AS event_source,
    jsonb_build_object(
        'source_table', 'vehicle_usage_events',
        'source_id', vu.id,
        'vehicle_id', vu.vehicle_id,
        'vehicle_plate', v.plate,
        'collaborator_id', vu.collaborator_id,
        'usage_type', vu.usage_type,
        'start_odometer', vu.start_odometer,
        'end_odometer', vu.end_odometer,
        'purpose', vu.purpose,
        'notes', vu.notes
    ) AS payload,
    vu.usage_date AS occurred_at,
    vu.usage_date AS ingested_at,
    'vehicle_usage_events' AS source_table,
    vu.id AS source_id
FROM public.vehicle_usage_events vu
JOIN public.vehicles v ON v.id = vu.vehicle_id;

ALTER VIEW public.v_event_vehicle_usage SET (security_invoker = on);

-- View: Manutenções de Veículos -> Eventos
CREATE OR REPLACE VIEW public.v_event_vehicle_maintenances AS
SELECT 
    v.profile_id,
    'vehicle_maintenance' AS entity_type,
    vm.id AS entity_id,
    CASE vm.maintenance_type
        WHEN 'PREVENTIVE' THEN 'VEHICLE_MAINTENANCE_PREVENTIVE'
        WHEN 'CORRECTIVE' THEN 'VEHICLE_MAINTENANCE_CORRECTIVE'
        WHEN 'PREDICTIVE' THEN 'VEHICLE_MAINTENANCE_PREDICTIVE'
        ELSE 'VEHICLE_MAINTENANCE_RECORDED'
    END AS event_type,
    'projection' AS event_source,
    jsonb_build_object(
        'source_table', 'vehicle_maintenances',
        'source_id', vm.id,
        'vehicle_id', vm.vehicle_id,
        'vehicle_plate', v.plate,
        'maintenance_type', vm.maintenance_type,
        'description', vm.description,
        'cost', vm.cost,
        'maintenance_date', vm.maintenance_date,
        'next_maintenance_date', vm.next_maintenance_date
    ) AS payload,
    vm.maintenance_date::timestamptz AS occurred_at,
    vm.created_at AS ingested_at,
    'vehicle_maintenances' AS source_table,
    vm.id AS source_id
FROM public.vehicle_maintenances vm
JOIN public.vehicles v ON v.id = vm.vehicle_id;

ALTER VIEW public.v_event_vehicle_maintenances SET (security_invoker = on);

-- View: Custos de Veículos -> Eventos
CREATE OR REPLACE VIEW public.v_event_vehicle_costs AS
SELECT 
    v.profile_id,
    'vehicle_cost' AS entity_type,
    vc.id AS entity_id,
    'VEHICLE_COST_' || UPPER(vc.cost_type) AS event_type,
    'projection' AS event_source,
    jsonb_build_object(
        'source_table', 'vehicle_costs',
        'source_id', vc.id,
        'vehicle_id', vc.vehicle_id,
        'vehicle_plate', v.plate,
        'cost_type', vc.cost_type,
        'amount', vc.amount,
        'reference_month', vc.reference_month,
        'notes', vc.notes
    ) AS payload,
    vc.reference_month::timestamptz AS occurred_at,
    vc.created_at AS ingested_at,
    'vehicle_costs' AS source_table,
    vc.id AS source_id
FROM public.vehicle_costs vc
JOIN public.vehicles v ON v.id = vc.vehicle_id;

ALTER VIEW public.v_event_vehicle_costs SET (security_invoker = on);

-- ============================================================================
-- PARTE D: VIEW UNIFICADA
-- ============================================================================

CREATE OR REPLACE VIEW public.v_domain_events_unified AS
-- Eventos oficiais (domain_events)
SELECT 
    de.profile_id,
    de.entity_type,
    de.entity_id,
    de.event_type,
    de.event_source,
    de.payload,
    de.occurred_at,
    de.ingested_at,
    COALESCE(de.payload->>'source_table', 'domain_events') AS source_table,
    COALESCE((de.payload->>'source_id')::uuid, de.id) AS source_id,
    'official' AS event_origin
FROM public.domain_events de

UNION ALL

-- Projeção de movimentações
SELECT profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at, ingested_at, source_table, source_id, 'projection' AS event_origin
FROM public.v_event_movimentacoes

UNION ALL

-- Projeção de consertos
SELECT profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at, ingested_at, source_table, source_id, 'projection' AS event_origin
FROM public.v_event_consertos

UNION ALL

-- Projeção de inventários
SELECT profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at, ingested_at, source_table, source_id, 'projection' AS event_origin
FROM public.v_event_inventarios

UNION ALL

-- Projeção de ajustes de inventário
SELECT profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at, ingested_at, source_table, source_id, 'projection' AS event_origin
FROM public.v_event_inventario_ajustes

UNION ALL

-- Projeção de uso de veículos
SELECT profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at, ingested_at, source_table, source_id, 'projection' AS event_origin
FROM public.v_event_vehicle_usage

UNION ALL

-- Projeção de manutenções de veículos
SELECT profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at, ingested_at, source_table, source_id, 'projection' AS event_origin
FROM public.v_event_vehicle_maintenances

UNION ALL

-- Projeção de custos de veículos
SELECT profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at, ingested_at, source_table, source_id, 'projection' AS event_origin
FROM public.v_event_vehicle_costs;

ALTER VIEW public.v_domain_events_unified SET (security_invoker = on);

COMMENT ON VIEW public.v_domain_events_unified IS 
'View unificada de todos os eventos (oficiais + projeções).
event_origin = "official" são de domain_events (fonte de verdade)
event_origin = "projection" são projeções de tabelas operacionais
Use para consumo analítico durante fase de transição.';

-- ============================================================================
-- PARTE E: FUNÇÃO AUXILIAR PARA INSERIR EVENTOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.safe_insert_domain_event(
    p_profile_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_event_type TEXT,
    p_event_source TEXT,
    p_payload JSONB,
    p_occurred_at TIMESTAMPTZ DEFAULT NOW(),
    p_source_table TEXT DEFAULT NULL,
    p_source_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_full_payload JSONB;
BEGIN
    -- Enriquecer payload com metadados
    v_full_payload := p_payload || jsonb_build_object(
        'source_table', COALESCE(p_source_table, 'manual'),
        'source_id', p_source_id,
        'ingested_by', 'safe_insert_domain_event'
    );
    
    -- Inserir evento
    INSERT INTO public.domain_events (
        profile_id, entity_type, entity_id, event_type, event_source, payload, occurred_at
    ) VALUES (
        p_profile_id, p_entity_type, p_entity_id, p_event_type, p_event_source, v_full_payload, p_occurred_at
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
EXCEPTION WHEN OTHERS THEN
    -- Registrar erro sem bloquear operação principal
    INSERT INTO public.event_ingestion_errors (
        profile_id, source_table, source_id, event_type, error_message, error_detail
    ) VALUES (
        p_profile_id, p_source_table, p_source_id, p_event_type, SQLERRM, 
        jsonb_build_object('sqlstate', SQLSTATE, 'payload', p_payload)
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.safe_insert_domain_event IS 
'Insere evento em domain_events de forma segura. 
Se falhar, registra em event_ingestion_errors sem bloquear operação.';

-- ============================================================================
-- PARTE F: TRIGGERS OPCIONAIS (controlados por event_ingestion_config)
-- ============================================================================

-- Função utilitária para verificar se triggers estão habilitados
CREATE OR REPLACE FUNCTION public.is_event_ingestion_enabled(p_profile_id UUID, p_event_type TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_config RECORD;
BEGIN
    SELECT * INTO v_config FROM public.event_ingestion_config WHERE profile_id = p_profile_id;
    
    -- Se não há config, triggers desabilitados por padrão
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Master switch
    IF NOT v_config.enable_triggers THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar tipo específico
    IF p_event_type LIKE 'TOOL_MOVEMENT%' THEN
        RETURN v_config.enable_movement_events;
    ELSIF p_event_type LIKE 'TOOL_REPAIR%' THEN
        RETURN v_config.enable_repair_events;
    ELSIF p_event_type LIKE 'INVENTORY%' THEN
        RETURN v_config.enable_inventory_events;
    ELSIF p_event_type LIKE 'VEHICLE%' THEN
        RETURN v_config.enable_vehicle_events;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Movimentações
CREATE OR REPLACE FUNCTION public.trigger_event_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type TEXT;
BEGIN
    -- Determinar tipo de evento
    v_event_type := CASE NEW.tipo
        WHEN 'entrada' THEN 'TOOL_MOVEMENT_IN'
        WHEN 'retirada' THEN 'TOOL_MOVEMENT_OUT'
        WHEN 'devolucao' THEN 'TOOL_MOVEMENT_RETURN'
        WHEN 'ajuste' THEN 'TOOL_MOVEMENT_ADJUSTMENT'
        WHEN 'conserto' THEN 'TOOL_MOVEMENT_REPAIR'
        ELSE 'TOOL_MOVEMENT_CREATED'
    END;
    
    -- Verificar se deve capturar
    IF public.is_event_ingestion_enabled(NEW.profile_id, v_event_type) THEN
        PERFORM public.safe_insert_domain_event(
            NEW.profile_id,
            'movement',
            NEW.id,
            v_event_type,
            'trigger',
            jsonb_build_object(
                'tipo', NEW.tipo,
                'quantidade', NEW.quantidade,
                'ferramenta_id', NEW.ferramenta_id,
                'colaborador_id', NEW.colaborador_id,
                'observacoes', NEW.observacoes
            ),
            COALESCE(NEW.data, NOW()),
            'movimentacoes',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_movimentacao ON public.movimentacoes;
CREATE TRIGGER trg_event_movimentacao
    AFTER INSERT ON public.movimentacoes
    FOR EACH ROW EXECUTE FUNCTION public.trigger_event_movimentacao();

-- Trigger: Consertos
CREATE OR REPLACE FUNCTION public.trigger_event_conserto()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type TEXT;
BEGIN
    v_event_type := CASE 
        WHEN TG_OP = 'INSERT' THEN 'TOOL_REPAIR_CREATED'
        WHEN NEW.status != OLD.status THEN 'TOOL_REPAIR_STATUS_CHANGED'
        ELSE 'TOOL_REPAIR_UPDATED'
    END;
    
    IF public.is_event_ingestion_enabled(NEW.profile_id, v_event_type) THEN
        PERFORM public.safe_insert_domain_event(
            NEW.profile_id,
            'repair',
            NEW.id,
            v_event_type,
            'trigger',
            jsonb_build_object(
                'status', NEW.status,
                'ferramenta_id', NEW.ferramenta_id,
                'descricao', NEW.descricao,
                'custo', NEW.custo,
                'before_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END
            ),
            NOW(),
            'consertos',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_conserto ON public.consertos;
CREATE TRIGGER trg_event_conserto
    AFTER INSERT OR UPDATE ON public.consertos
    FOR EACH ROW EXECUTE FUNCTION public.trigger_event_conserto();

-- Trigger: Inventários
CREATE OR REPLACE FUNCTION public.trigger_event_inventario()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type TEXT;
BEGIN
    v_event_type := CASE 
        WHEN TG_OP = 'INSERT' THEN 'INVENTORY_STARTED'
        WHEN NEW.status = 'finalizado' AND (OLD.status IS NULL OR OLD.status != 'finalizado') THEN 'INVENTORY_FINISHED'
        WHEN NEW.status = 'cancelado' THEN 'INVENTORY_CANCELLED'
        ELSE 'INVENTORY_UPDATED'
    END;
    
    IF public.is_event_ingestion_enabled(NEW.profile_id, v_event_type) THEN
        PERFORM public.safe_insert_domain_event(
            NEW.profile_id,
            'inventory',
            NEW.id,
            v_event_type,
            'trigger',
            jsonb_build_object(
                'status', NEW.status,
                'descricao', NEW.descricao,
                'total_itens', NEW.total_itens,
                'itens_contados', NEW.itens_contados,
                'total_divergencias', NEW.total_divergencias
            ),
            NOW(),
            'inventarios',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_inventario ON public.inventarios;
CREATE TRIGGER trg_event_inventario
    AFTER INSERT OR UPDATE ON public.inventarios
    FOR EACH ROW EXECUTE FUNCTION public.trigger_event_inventario();

-- Trigger: Uso de Veículos
CREATE OR REPLACE FUNCTION public.trigger_event_vehicle_usage()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_id UUID;
    v_event_type TEXT;
BEGIN
    -- Buscar profile_id do veículo
    SELECT profile_id INTO v_profile_id FROM public.vehicles WHERE id = NEW.vehicle_id;
    
    v_event_type := CASE NEW.usage_type
        WHEN 'assignment' THEN 'VEHICLE_ASSIGNED'
        WHEN 'return' THEN 'VEHICLE_RETURNED'
        WHEN 'trip' THEN 'VEHICLE_TRIP_RECORDED'
        ELSE 'VEHICLE_USAGE_RECORDED'
    END;
    
    IF public.is_event_ingestion_enabled(v_profile_id, v_event_type) THEN
        PERFORM public.safe_insert_domain_event(
            v_profile_id,
            'vehicle_usage',
            NEW.id,
            v_event_type,
            'trigger',
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'collaborator_id', NEW.collaborator_id,
                'usage_type', NEW.usage_type,
                'start_odometer', NEW.start_odometer,
                'end_odometer', NEW.end_odometer,
                'purpose', NEW.purpose
            ),
            NEW.usage_date,
            'vehicle_usage_events',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_vehicle_usage ON public.vehicle_usage_events;
CREATE TRIGGER trg_event_vehicle_usage
    AFTER INSERT ON public.vehicle_usage_events
    FOR EACH ROW EXECUTE FUNCTION public.trigger_event_vehicle_usage();

-- Trigger: Manutenções de Veículos
CREATE OR REPLACE FUNCTION public.trigger_event_vehicle_maintenance()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT profile_id INTO v_profile_id FROM public.vehicles WHERE id = NEW.vehicle_id;
    
    IF public.is_event_ingestion_enabled(v_profile_id, 'VEHICLE_MAINTENANCE_RECORDED') THEN
        PERFORM public.safe_insert_domain_event(
            v_profile_id,
            'vehicle_maintenance',
            NEW.id,
            'VEHICLE_MAINTENANCE_' || COALESCE(UPPER(NEW.maintenance_type), 'RECORDED'),
            'trigger',
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'maintenance_type', NEW.maintenance_type,
                'description', NEW.description,
                'cost', NEW.cost,
                'maintenance_date', NEW.maintenance_date
            ),
            NEW.maintenance_date::timestamptz,
            'vehicle_maintenances',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_vehicle_maintenance ON public.vehicle_maintenances;
CREATE TRIGGER trg_event_vehicle_maintenance
    AFTER INSERT ON public.vehicle_maintenances
    FOR EACH ROW EXECUTE FUNCTION public.trigger_event_vehicle_maintenance();

-- Trigger: Custos de Veículos
CREATE OR REPLACE FUNCTION public.trigger_event_vehicle_cost()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT profile_id INTO v_profile_id FROM public.vehicles WHERE id = NEW.vehicle_id;
    
    IF public.is_event_ingestion_enabled(v_profile_id, 'VEHICLE_COST_RECORDED') THEN
        PERFORM public.safe_insert_domain_event(
            v_profile_id,
            'vehicle_cost',
            NEW.id,
            'VEHICLE_COST_' || UPPER(COALESCE(NEW.cost_type, 'OTHER')),
            'trigger',
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'cost_type', NEW.cost_type,
                'amount', NEW.amount,
                'reference_month', NEW.reference_month,
                'notes', NEW.notes
            ),
            NEW.reference_month::timestamptz,
            'vehicle_costs',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_vehicle_cost ON public.vehicle_costs;
CREATE TRIGGER trg_event_vehicle_cost
    AFTER INSERT ON public.vehicle_costs
    FOR EACH ROW EXECUTE FUNCTION public.trigger_event_vehicle_cost();

-- ============================================================================
-- PARTE G: ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

-- domain_events - índices compostos
CREATE INDEX IF NOT EXISTS idx_domain_events_profile_occurred 
    ON public.domain_events(profile_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_entity_occurred 
    ON public.domain_events(entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_event_type 
    ON public.domain_events(event_type, occurred_at DESC);

-- derived_metrics - índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_derived_metrics_current_key 
    ON public.derived_metrics(profile_id, metric_key, is_current, calculated_at DESC) 
    WHERE is_current = TRUE;

-- operational_baselines - índice para consultas ativas
CREATE INDEX IF NOT EXISTS idx_operational_baselines_active_lookup 
    ON public.operational_baselines(profile_id, entity_type, metric_key, is_active) 
    WHERE is_active = TRUE;

-- ============================================================================
-- PARTE H: DOCUMENTAÇÃO E GOVERNANÇA
-- ============================================================================

-- Atualizar comentários de tabelas existentes
COMMENT ON TABLE public.domain_events IS 
'Tabela central de eventos imutáveis (append-only).
REGRAS DE GOVERNANÇA:
1. NUNCA delete ou update registros
2. payload DEVE conter source_table e source_id
3. event_type deve seguir padrão: ENTITY_ACTION (ex: TOOL_MOVEMENT_CREATED)
4. event_source: system | user | trigger | automation | import | migration
5. Toda IA e analytics devem consumir desta tabela';

COMMENT ON TABLE public.derived_metrics IS 
'Métricas derivadas versionadas.
REGRAS DE GOVERNANÇA:
1. Sempre derivar de domain_events, NUNCA de tabelas operacionais
2. calculation_version identifica a versão do algoritmo
3. is_current = TRUE apenas para a métrica mais recente
4. confidence_level baseado em based_on_event_count';

COMMENT ON TABLE public.operational_baselines IS 
'Baselines operacionais para detecção de anomalias.
REGRAS DE GOVERNANÇA:
1. Usar para comparar métricas atuais vs esperado
2. Recalcular periodicamente (ex: mensal)
3. expected_min/max definem faixa normal
4. standard_deviation para cálculo de z-score';

COMMENT ON TABLE public.event_ingestion_config IS 
'Configuração de ingestão de eventos por organização.
REGRAS:
1. enable_triggers = FALSE por padrão (opt-in)
2. Cada tipo de evento pode ser controlado individualmente
3. Triggers NUNCA bloqueiam operação principal';

-- Comentários em colunas importantes
COMMENT ON COLUMN public.domain_events.payload IS 
'Payload do evento em JSONB. DEVE conter:
- source_table: tabela de origem
- source_id: ID do registro original
Pode conter: before/after para updates, actor_profile_id, related_ids';

COMMENT ON COLUMN public.domain_events.event_source IS 
'Origem do evento:
- system: gerado automaticamente
- user: ação direta do usuário
- trigger: capturado via trigger SQL
- automation: processo automatizado
- import: importação de dados
- migration: migração de dados históricos';
