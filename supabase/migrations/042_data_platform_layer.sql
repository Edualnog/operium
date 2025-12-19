-- ============================================================================
-- Migration: 042_data_platform_layer.sql
-- Description: Evolução do banco para plataforma de dados e inteligência operacional
-- Author: AI Assistant
-- Date: 2024-12-19
-- 
-- PRINCÍPIOS FUNDAMENTAIS:
-- 1. Nenhum dado operacional existente é alterado
-- 2. domain_events é append-only (fonte de verdade histórica)
-- 3. Métricas NUNCA são calculadas diretamente do operacional
-- 4. Toda IA futura deve consumir apenas eventos e métricas derivadas
-- 5. Todo evento é explicável, toda métrica é auditável
-- ============================================================================

-- ============================================================================
-- PARTE 1: TABELA CENTRAL DE EVENTOS IMUTÁVEIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Identificação da entidade
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'tool',           -- Ferramentas
        'asset',          -- Ativos genéricos
        'vehicle',        -- Veículos
        'collaborator',   -- Colaboradores
        'inventory',      -- Inventário
        'product',        -- Produtos
        'movement',       -- Movimentações
        'repair',         -- Consertos
        'maintenance',    -- Manutenções
        'cost',           -- Custos
        'generic'         -- Eventos genéricos
    )),
    entity_id UUID,
    
    -- Tipo e origem do evento
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'system' CHECK (event_source IN (
        'system',      -- Gerado automaticamente pelo sistema
        'user',        -- Ação direta do usuário
        'automation',  -- Gerado por automação/trigger
        'import',      -- Importação de dados
        'migration'    -- Migração de dados históricos
    )),
    
    -- Payload do evento (dados completos)
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT domain_events_entity_id_required CHECK (
        entity_type = 'generic' OR entity_id IS NOT NULL
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_domain_events_org_id ON public.domain_events(org_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_entity ON public.domain_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON public.domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_occurred ON public.domain_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_payload ON public.domain_events USING gin(payload);

-- Documentação
COMMENT ON TABLE public.domain_events IS 
'Tabela central de eventos imutáveis (append-only). Esta é a FONTE DE VERDADE HISTÓRICA.
Toda análise, métrica e IA deve consumir dados desta tabela.
NUNCA delete ou atualize registros nesta tabela.';

COMMENT ON COLUMN public.domain_events.entity_type IS 'Tipo da entidade que gerou o evento';
COMMENT ON COLUMN public.domain_events.event_type IS 'Tipo específico do evento (ex: TOOL_ASSIGNED, VEHICLE_MAINTENANCE_COMPLETED)';
COMMENT ON COLUMN public.domain_events.event_source IS 'Origem do evento: system, user, automation, import, migration';
COMMENT ON COLUMN public.domain_events.payload IS 'Dados completos do evento em formato JSON. Contém snapshot do estado no momento do evento.';
COMMENT ON COLUMN public.domain_events.occurred_at IS 'Momento em que o evento REALMENTE ocorreu no mundo real';
COMMENT ON COLUMN public.domain_events.ingested_at IS 'Momento em que o evento foi registrado no sistema';

-- ============================================================================
-- PARTE 2: TABELA DE CONTEXTO CAUSAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.domain_events(id) ON DELETE CASCADE,
    
    -- Contexto temporal
    shift TEXT CHECK (shift IN ('day', 'night', 'weekend', 'holiday')),
    
    -- Contexto operacional
    urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    operational_pressure TEXT DEFAULT 'normal' CHECK (operational_pressure IN ('normal', 'overload', 'underload', 'emergency')),
    
    -- Desvios de processo
    was_outside_process BOOLEAN DEFAULT FALSE,
    deviation_reason TEXT,
    
    -- Contexto adicional
    notes TEXT,
    context_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT event_context_unique_event UNIQUE(event_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_event_context_event_id ON public.event_context(event_id);
CREATE INDEX IF NOT EXISTS idx_event_context_shift ON public.event_context(shift);
CREATE INDEX IF NOT EXISTS idx_event_context_urgency ON public.event_context(urgency_level);

-- Documentação
COMMENT ON TABLE public.event_context IS 
'Contexto causal e operacional de eventos. Permite entender POR QUE o evento ocorreu.
Usado para análise de causalidade e identificação de padrões de desvio.';

COMMENT ON COLUMN public.event_context.shift IS 'Turno em que o evento ocorreu: day, night, weekend, holiday';
COMMENT ON COLUMN public.event_context.urgency_level IS 'Nível de urgência no momento do evento';
COMMENT ON COLUMN public.event_context.operational_pressure IS 'Pressão operacional no momento: normal, overload, underload, emergency';
COMMENT ON COLUMN public.event_context.was_outside_process IS 'Se o evento ocorreu fora do processo padrão';
COMMENT ON COLUMN public.event_context.deviation_reason IS 'Razão do desvio de processo, se aplicável';

-- ============================================================================
-- PARTE 3: TABELA DE MÉTRICAS DERIVADAS VERSIONADAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.derived_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Identificação da métrica
    metric_key TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    
    -- Valor e confiança
    value NUMERIC NOT NULL,
    confidence_level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERIFIED')),
    
    -- Metadados de cálculo
    calculation_version TEXT NOT NULL DEFAULT '1.0',
    based_on_event_count INTEGER NOT NULL DEFAULT 0,
    calculation_metadata JSONB DEFAULT '{}',
    
    -- Período de referência
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Status
    is_current BOOLEAN DEFAULT TRUE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_derived_metrics_org_id ON public.derived_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_derived_metrics_key ON public.derived_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_derived_metrics_entity ON public.derived_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_derived_metrics_current ON public.derived_metrics(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_derived_metrics_calculated ON public.derived_metrics(calculated_at DESC);

-- Documentação
COMMENT ON TABLE public.derived_metrics IS 
'Métricas derivadas versionadas. Toda métrica é calculada a partir de domain_events.
NUNCA calcule métricas diretamente das tabelas operacionais.
Cada métrica tem versão de cálculo e nível de confiança.';

COMMENT ON COLUMN public.derived_metrics.metric_key IS 'Chave única da métrica (ex: avg_maintenance_cost, tool_usage_rate)';
COMMENT ON COLUMN public.derived_metrics.value IS 'Valor numérico da métrica';
COMMENT ON COLUMN public.derived_metrics.confidence_level IS 'Nível de confiança: LOW (poucos dados), MEDIUM (dados suficientes), HIGH (dados robustos), VERIFIED (verificado manualmente)';
COMMENT ON COLUMN public.derived_metrics.calculation_version IS 'Versão do algoritmo de cálculo. Permite rastrear mudanças de metodologia.';
COMMENT ON COLUMN public.derived_metrics.based_on_event_count IS 'Quantidade de eventos usados no cálculo. Maior = mais confiável.';

-- ============================================================================
-- PARTE 4: TABELA DE BASELINE OPERACIONAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operational_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Identificação
    entity_type TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    
    -- Valores esperados
    expected_min NUMERIC,
    expected_max NUMERIC,
    expected_avg NUMERIC,
    standard_deviation NUMERIC,
    
    -- Período de análise
    period_window_days INTEGER NOT NULL DEFAULT 30,
    
    -- Metadados
    sample_size INTEGER NOT NULL DEFAULT 0,
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    calculation_metadata JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT operational_baselines_unique UNIQUE(org_id, entity_type, metric_key)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_operational_baselines_org ON public.operational_baselines(org_id);
CREATE INDEX IF NOT EXISTS idx_operational_baselines_entity ON public.operational_baselines(entity_type);
CREATE INDEX IF NOT EXISTS idx_operational_baselines_active ON public.operational_baselines(is_active) WHERE is_active = TRUE;

-- Documentação
COMMENT ON TABLE public.operational_baselines IS 
'Baseline operacional por organização. Define valores esperados para cada métrica.
Usado para detecção de anomalias e alertas.';

COMMENT ON COLUMN public.operational_baselines.expected_min IS 'Valor mínimo esperado para a métrica';
COMMENT ON COLUMN public.operational_baselines.expected_max IS 'Valor máximo esperado para a métrica';
COMMENT ON COLUMN public.operational_baselines.period_window_days IS 'Janela de análise em dias para cálculo do baseline';
COMMENT ON COLUMN public.operational_baselines.sample_size IS 'Quantidade de amostras usadas no cálculo do baseline';

-- ============================================================================
-- PARTE 5: VIEWS DE PROJEÇÃO DE EVENTOS
-- ============================================================================

-- View: Movimentações → Eventos
CREATE OR REPLACE VIEW public.v_events_movements AS
SELECT 
    gen_random_uuid() AS id,
    m.org_id,
    'movement' AS entity_type,
    m.id AS entity_id,
    CASE 
        WHEN m.tipo = 'ENTRADA' THEN 'MOVEMENT_IN'
        WHEN m.tipo = 'SAIDA' THEN 'MOVEMENT_OUT'
        WHEN m.tipo = 'DEVOLUCAO' THEN 'MOVEMENT_RETURN'
        ELSE 'MOVEMENT_OTHER'
    END AS event_type,
    'system' AS event_source,
    jsonb_build_object(
        'tipo', m.tipo,
        'quantidade', m.quantidade,
        'produto_id', m.produto_id,
        'colaborador_id', m.colaborador_id,
        'observacao', m.observacao
    ) AS payload,
    m.created_at AS occurred_at,
    NOW() AS ingested_at
FROM public.movimentacoes m;

COMMENT ON VIEW public.v_events_movements IS 
'View de projeção: Transforma movimentações em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.';

-- View: Consertos → Eventos
CREATE OR REPLACE VIEW public.v_events_repairs AS
SELECT 
    gen_random_uuid() AS id,
    c.org_id,
    'repair' AS entity_type,
    c.id AS entity_id,
    CASE 
        WHEN c.status = 'PENDENTE' THEN 'REPAIR_REQUESTED'
        WHEN c.status = 'EM_ANDAMENTO' THEN 'REPAIR_STARTED'
        WHEN c.status = 'CONCLUIDO' THEN 'REPAIR_COMPLETED'
        WHEN c.status = 'CANCELADO' THEN 'REPAIR_CANCELLED'
        ELSE 'REPAIR_STATUS_CHANGED'
    END AS event_type,
    'system' AS event_source,
    jsonb_build_object(
        'status', c.status,
        'ferramenta_id', c.ferramenta_id,
        'descricao', c.descricao,
        'custo', c.custo
    ) AS payload,
    COALESCE(c.data_conclusao, c.created_at) AS occurred_at,
    NOW() AS ingested_at
FROM public.consertos c;

COMMENT ON VIEW public.v_events_repairs IS 
'View de projeção: Transforma consertos em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.';

-- View: Uso de Veículos → Eventos
CREATE OR REPLACE VIEW public.v_events_vehicle_usage AS
SELECT 
    gen_random_uuid() AS id,
    v.org_id,
    'vehicle' AS entity_type,
    vu.vehicle_id AS entity_id,
    CASE 
        WHEN vu.end_time IS NULL THEN 'VEHICLE_CHECKOUT'
        ELSE 'VEHICLE_RETURNED'
    END AS event_type,
    'system' AS event_source,
    jsonb_build_object(
        'driver_id', vu.driver_id,
        'start_time', vu.start_time,
        'end_time', vu.end_time,
        'start_odometer', vu.start_odometer,
        'end_odometer', vu.end_odometer,
        'purpose', vu.purpose,
        'distance_km', CASE WHEN vu.end_odometer IS NOT NULL AND vu.start_odometer IS NOT NULL 
            THEN vu.end_odometer - vu.start_odometer ELSE NULL END
    ) AS payload,
    COALESCE(vu.end_time, vu.start_time) AS occurred_at,
    NOW() AS ingested_at
FROM public.vehicle_usage_events vu
JOIN public.vehicles v ON v.id = vu.vehicle_id;

COMMENT ON VIEW public.v_events_vehicle_usage IS 
'View de projeção: Transforma uso de veículos em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.';

-- View: Manutenções de Veículos → Eventos
CREATE OR REPLACE VIEW public.v_events_vehicle_maintenance AS
SELECT 
    gen_random_uuid() AS id,
    v.org_id,
    'maintenance' AS entity_type,
    vm.id AS entity_id,
    CASE vm.maintenance_type
        WHEN 'PREVENTIVE' THEN 'MAINTENANCE_PREVENTIVE'
        WHEN 'CORRECTIVE' THEN 'MAINTENANCE_CORRECTIVE'
        WHEN 'PREDICTIVE' THEN 'MAINTENANCE_PREDICTIVE'
        ELSE 'MAINTENANCE_OTHER'
    END AS event_type,
    'system' AS event_source,
    jsonb_build_object(
        'vehicle_id', vm.vehicle_id,
        'maintenance_type', vm.maintenance_type,
        'description', vm.description,
        'cost', vm.cost,
        'next_maintenance_date', vm.next_maintenance_date
    ) AS payload,
    vm.maintenance_date AS occurred_at,
    NOW() AS ingested_at
FROM public.vehicle_maintenances vm
JOIN public.vehicles v ON v.id = vm.vehicle_id;

COMMENT ON VIEW public.v_events_vehicle_maintenance IS 
'View de projeção: Transforma manutenções de veículos em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.';

-- View: Custos de Veículos → Eventos
CREATE OR REPLACE VIEW public.v_events_vehicle_costs AS
SELECT 
    gen_random_uuid() AS id,
    v.org_id,
    'cost' AS entity_type,
    vc.id AS entity_id,
    'VEHICLE_COST_' || vc.cost_type AS event_type,
    'system' AS event_source,
    jsonb_build_object(
        'vehicle_id', vc.vehicle_id,
        'cost_type', vc.cost_type,
        'amount', vc.amount,
        'reference_month', vc.reference_month,
        'notes', vc.notes
    ) AS payload,
    COALESCE(vc.reference_month::date, vc.created_at) AS occurred_at,
    NOW() AS ingested_at
FROM public.vehicle_costs vc
JOIN public.vehicles v ON v.id = vc.vehicle_id;

COMMENT ON VIEW public.v_events_vehicle_costs IS 
'View de projeção: Transforma custos de veículos em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.';

-- View: Inventário → Eventos
CREATE OR REPLACE VIEW public.v_events_inventory AS
SELECT 
    gen_random_uuid() AS id,
    i.org_id,
    'inventory' AS entity_type,
    i.id AS entity_id,
    CASE 
        WHEN i.status = 'PENDENTE' THEN 'INVENTORY_STARTED'
        WHEN i.status = 'EM_ANDAMENTO' THEN 'INVENTORY_IN_PROGRESS'
        WHEN i.status = 'CONCLUIDO' THEN 'INVENTORY_COMPLETED'
        ELSE 'INVENTORY_STATUS_CHANGED'
    END AS event_type,
    'system' AS event_source,
    jsonb_build_object(
        'status', i.status,
        'observacoes', i.observacoes
    ) AS payload,
    COALESCE(i.data_finalizacao, i.data_inicio) AS occurred_at,
    NOW() AS ingested_at
FROM public.inventarios i;

COMMENT ON VIEW public.v_events_inventory IS 
'View de projeção: Transforma inventários em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.';

-- ============================================================================
-- PARTE 6: VIEW UNIFICADA DE TODOS OS EVENTOS
-- ============================================================================

CREATE OR REPLACE VIEW public.v_all_projected_events AS
SELECT * FROM public.v_events_movements
UNION ALL
SELECT * FROM public.v_events_repairs
UNION ALL
SELECT * FROM public.v_events_vehicle_usage
UNION ALL
SELECT * FROM public.v_events_vehicle_maintenance
UNION ALL
SELECT * FROM public.v_events_vehicle_costs
UNION ALL
SELECT * FROM public.v_events_inventory;

COMMENT ON VIEW public.v_all_projected_events IS 
'View unificada de todos os eventos projetados a partir das tabelas operacionais.
Use esta view para sincronizar dados históricos com domain_events.
IMPORTANTE: Esta view NÃO substitui domain_events. É apenas para migração inicial.';

-- ============================================================================
-- PARTE 7: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.derived_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_baselines ENABLE ROW LEVEL SECURITY;

-- Policy: domain_events
CREATE POLICY "Users can view events of their org" ON public.domain_events
    FOR SELECT USING (org_id = auth.uid());

CREATE POLICY "Users can insert events for their org" ON public.domain_events
    FOR INSERT WITH CHECK (org_id = auth.uid());

-- Policy: event_context
CREATE POLICY "Users can view context of their events" ON public.event_context
    FOR SELECT USING (
        event_id IN (SELECT id FROM public.domain_events WHERE org_id = auth.uid())
    );

CREATE POLICY "Users can insert context for their events" ON public.event_context
    FOR INSERT WITH CHECK (
        event_id IN (SELECT id FROM public.domain_events WHERE org_id = auth.uid())
    );

-- Policy: derived_metrics
CREATE POLICY "Users can view metrics of their org" ON public.derived_metrics
    FOR SELECT USING (org_id = auth.uid());

CREATE POLICY "Users can insert metrics for their org" ON public.derived_metrics
    FOR INSERT WITH CHECK (org_id = auth.uid());

-- Policy: operational_baselines
CREATE POLICY "Users can view baselines of their org" ON public.operational_baselines
    FOR SELECT USING (org_id = auth.uid());

CREATE POLICY "Users can manage baselines for their org" ON public.operational_baselines
    FOR ALL USING (org_id = auth.uid());

-- ============================================================================
-- PARTE 8: DOCUMENTAÇÃO GERAL
-- ============================================================================

COMMENT ON SCHEMA public IS 
'Schema principal do ERP industrial com camada de dados para inteligência operacional.

PRINCÍPIOS DO DATA PLATFORM:
1. domain_events é a FONTE DE VERDADE HISTÓRICA (append-only)
2. Métricas NUNCA devem ser calculadas diretamente do operacional
3. Toda IA futura deve consumir APENAS eventos e métricas derivadas
4. Todo evento é explicável (via event_context)
5. Toda métrica é auditável (via derived_metrics)
6. Nenhum dado é sobrescrito - apenas adicionado

FLUXO DE DADOS:
Tabelas Operacionais → Views de Projeção → domain_events → derived_metrics → AI/Analytics

CAMADAS:
1. Operacional: movimentacoes, consertos, vehicles, etc.
2. Eventos: domain_events (imutável)
3. Contexto: event_context (causalidade)
4. Métricas: derived_metrics (versionadas)
5. Baselines: operational_baselines (detecção de anomalias)';
