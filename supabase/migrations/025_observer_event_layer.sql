-- Migration: 025_observer_event_layer.sql
-- Description: Cria uma camada lógica de eventos "Observer" unificando tabelas operacionais.
-- Context: Strategy "Equity de Dados" - Transformar operações em sinais comportamentais.
-- Author: Antigravity Agent (Data Architect)

-- Garante schema analytics
CREATE SCHEMA IF NOT EXISTS analytics;

-- VIEW: events_log
-- Unifica movimentacoes, consertos, ajustes de inventario e termos em um stream único.
-- Esta view serve como base para análise comportamental sem acoplar o frontend.
CREATE OR REPLACE VIEW analytics.events_log AS
SELECT
    -- Identificadores
    m.id::text AS event_id,
    m.profile_id,
    m.data AS timestamp,
    
    -- Semântica do Evento
    'movimentacao' AS category,
    m.tipo AS action, -- entrada, retirada, devolucao, ajuste, conserto
    
    -- Atores e Objetos
    m.colaborador_id AS actor_id,
    m.ferramenta_id AS object_id,
    
    -- Contexto Rico (JSONB para flexibilidade futura)
    jsonb_build_object(
        'quantity', m.quantidade,
        'obs', m.observacoes,
        'source_table', 'movimentacoes'
    ) AS context,
    
    -- Metadados de Qualidade
    CASE 
        WHEN m.tipo = 'ajuste' THEN 'CORRECTION' 
        ELSE 'OPERATION' 
    END AS signal_type

FROM public.movimentacoes m

UNION ALL

SELECT
    c.id::text,
    c.profile_id,
    COALESCE(c.data_envio, NOW()) AS timestamp, -- Fallback seguro
    
    'conserto',
    c.status, -- aguardando, em_andamento, concluido
    
    NULL AS actor_id, -- Conserto geralmente não tem colaborador direto, ou é implícito
    c.ferramenta_id AS object_id,
    
    jsonb_build_object(
        'cost', c.custo,
        'description', c.descricao,
        'return_date', c.data_retorno,
        'source_table', 'consertos'
    ),
    
    CASE 
        WHEN c.custo > 0 THEN 'DEGRADATION' -- Custo implica desgaste
        ELSE 'MAINTENANCE' 
    END

FROM public.consertos c

UNION ALL

SELECT
    ia.id::text,
    i.profile_id,
    ia.data_ajuste AS timestamp,
    
    'inventario',
    ia.motivo, -- perda_avaria, erro_lancamento, etc
    
    NULL AS actor_id, -- Inventario feito por usuario do sistema, mas não linkado a colaborador aqui
    ii.ferramenta_id AS object_id,
    
    jsonb_build_object(
        'qty_old', ia.quantidade_anterior,
        'qty_new', ia.quantidade_nova,
        'diff', ia.diferenca,
        'approved_by', ia.aprovado_por,
        'inventory_id', i.id,
        'source_table', 'inventario_ajustes'
    ),
    
    'DIVERGENCE' -- Ajustes de inventário são fortissimos sinais de divergência

FROM public.inventario_ajustes ia
JOIN public.inventario_itens ii ON ia.inventario_item_id = ii.id
JOIN public.inventarios i ON ii.inventario_id = i.id

UNION ALL

SELECT
    t.id::text,
    t.profile_id,
    t.data_assinatura AS timestamp,
    
    'legal',
    CONCAT('termo_', t.tipo), -- termo_retirada, termo_devolucao
    
    t.colaborador_id AS actor_id,
    t.movimentacao_id AS object_id, -- Nota: Aqui o object não é ferramenta direto, é o ID da movimentacao vinculada
    
    jsonb_build_object(
        'signed', (t.assinatura_url IS NOT NULL OR t.assinatura_base64 IS NOT NULL),
        'item_count', jsonb_array_length(t.itens),
        'source_table', 'termos_responsabilidade'
    ),
    
    'COMPLIANCE'

FROM public.termos_responsabilidade t;

-- Comentários estratégicos para documentação viva
COMMENT ON VIEW analytics.events_log IS 'Streams unificado de eventos operacionais. Base para cálculo de Equity de Dados e padrões comportamentais.';
COMMENT ON COLUMN analytics.events_log.signal_type IS 'Classificação semântica do sinal: OPERATION (neutro), CORRECTION (erro operacional), DEGRADATION (desgaste de ativo), DIVERGENCE (erro de estoque), COMPLIANCE (formalização).';

-- RLS
-- Views herdam permissões das tabelas base, mas como estamos em schema de analytics,
-- é boa prática garantir que o usuário só veja seus dados se consultada diretamente.
-- Como é VIEW (não Materialized), o RLS das tabelas base (public.*) será aplicado automaticamente se o usuário tiver acesso.
-- Porém, para garantir explicitamente:
GRANT SELECT ON analytics.events_log TO authenticated;
