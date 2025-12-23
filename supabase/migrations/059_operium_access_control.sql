-- ============================================================================
-- OPERIUM - Sistema de Controle de Acesso Operacional v1.0
-- ============================================================================
-- Objetivo: Implementar sistema multi-tenant com RLS para colaboradores internos
-- Papéis: ADMIN, FIELD (campo), WAREHOUSE (almoxarifado)
-- ============================================================================

-- ============================================================================
-- SEÇÃO 1: CRIAÇÃO DAS TABELAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 PROFILES - Perfis de colaboradores
-- ----------------------------------------------------------------------------
-- Armazena o papel (role) de cada usuário dentro de sua organização
-- O org_id vincula o usuário a uma organização específica (multi-tenant)

CREATE TABLE IF NOT EXISTS operium_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'FIELD', 'WAREHOUSE')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por organização (otimiza RLS)
CREATE INDEX IF NOT EXISTS idx_operium_profiles_org_id ON operium_profiles(org_id);

-- Índice para busca por papel (útil para relatórios)
CREATE INDEX IF NOT EXISTS idx_operium_profiles_role ON operium_profiles(role);

COMMENT ON TABLE operium_profiles IS 'Perfis operacionais dos colaboradores com papéis ADMIN/FIELD/WAREHOUSE';
COMMENT ON COLUMN operium_profiles.role IS 'Papel operacional: ADMIN (tudo), FIELD (despesas veículos), WAREHOUSE (movimentação estoque)';

-- ----------------------------------------------------------------------------
-- 1.2 VEHICLES - Veículos da organização
-- ----------------------------------------------------------------------------
-- Cadastro de veículos que podem receber despesas e status operacionais

CREATE TABLE IF NOT EXISTS operium_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    plate TEXT NOT NULL,
    model TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, plate) -- Placa única por organização
);

-- Índice para busca por organização (otimiza RLS)
CREATE INDEX IF NOT EXISTS idx_operium_vehicles_org_id ON operium_vehicles(org_id);

COMMENT ON TABLE operium_vehicles IS 'Cadastro de veículos da organização';
COMMENT ON COLUMN operium_vehicles.status IS 'Status operacional: ACTIVE, MAINTENANCE, INACTIVE';

-- ----------------------------------------------------------------------------
-- 1.3 INVENTORY_ITEMS - Itens do almoxarifado
-- ----------------------------------------------------------------------------
-- Cadastro de itens que podem ter movimentações (entrada/saída)

CREATE TABLE IF NOT EXISTS operium_inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por organização (otimiza RLS)
CREATE INDEX IF NOT EXISTS idx_operium_inventory_items_org_id ON operium_inventory_items(org_id);

COMMENT ON TABLE operium_inventory_items IS 'Itens do almoxarifado com controle de quantidade';

-- ----------------------------------------------------------------------------
-- 1.4 OPERATIONAL_EVENTS - Eventos operacionais (imutáveis)
-- ----------------------------------------------------------------------------
-- Registro de todos os eventos operacionais (despesas, movimentações)
-- Esta tabela é APPEND-ONLY: não permite UPDATE ou DELETE

CREATE TABLE IF NOT EXISTS operium_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('VEHICLE_EXPENSE', 'ITEM_IN', 'ITEM_OUT', 'VEHICLE_STATUS')),
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    target_id UUID NOT NULL, -- ID do veículo ou item afetado
    metadata JSONB NOT NULL DEFAULT '{}', -- Dados extras (valor, quantidade, observações)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por organização (otimiza RLS)
CREATE INDEX IF NOT EXISTS idx_operium_events_org_id ON operium_events(org_id);

-- Índice para busca por tipo de evento
CREATE INDEX IF NOT EXISTS idx_operium_events_type ON operium_events(type);

-- Índice para busca por ator (quem realizou a ação)
CREATE INDEX IF NOT EXISTS idx_operium_events_actor ON operium_events(actor_user_id);

-- Índice para busca por data (relatórios)
CREATE INDEX IF NOT EXISTS idx_operium_events_created_at ON operium_events(created_at DESC);

COMMENT ON TABLE operium_events IS 'Eventos operacionais imutáveis (append-only)';
COMMENT ON COLUMN operium_events.type IS 'Tipo: VEHICLE_EXPENSE, ITEM_IN, ITEM_OUT, VEHICLE_STATUS';
COMMENT ON COLUMN operium_events.metadata IS 'Dados extras em JSON: valor, quantidade, foto_nf, observações';

-- ============================================================================
-- SEÇÃO 2: ATIVAÇÃO DO RLS
-- ============================================================================

ALTER TABLE operium_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operium_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operium_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operium_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEÇÃO 3: FUNÇÃO HELPER PARA OBTER PAPEL DO USUÁRIO
-- ============================================================================
-- Função materializada que retorna o papel do usuário autenticado
-- Otimizada para evitar subconsultas repetidas nas policies

CREATE OR REPLACE FUNCTION operium_get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM operium_profiles 
    WHERE user_id = auth.uid() AND active = true
    LIMIT 1;
$$;

-- Função para obter org_id do usuário autenticado
CREATE OR REPLACE FUNCTION operium_get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM operium_profiles 
    WHERE user_id = auth.uid() AND active = true
    LIMIT 1;
$$;

COMMENT ON FUNCTION operium_get_user_role IS 'Retorna o papel (ADMIN/FIELD/WAREHOUSE) do usuário autenticado';
COMMENT ON FUNCTION operium_get_user_org_id IS 'Retorna o org_id do usuário autenticado';

-- ============================================================================
-- SEÇÃO 4: POLICIES DE RLS - PROFILES
-- ============================================================================

-- SELECT: Todos podem ver perfis da sua organização
CREATE POLICY "operium_profiles_select_own_org" ON operium_profiles
    FOR SELECT
    USING (org_id = operium_get_user_org_id());

-- INSERT: Apenas ADMIN pode criar novos perfis na organização
CREATE POLICY "operium_profiles_insert_admin" ON operium_profiles
    FOR INSERT
    WITH CHECK (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    );

-- UPDATE: Apenas ADMIN pode atualizar perfis (exceto mudar para outra org)
CREATE POLICY "operium_profiles_update_admin" ON operium_profiles
    FOR UPDATE
    USING (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    )
    WITH CHECK (
        org_id = operium_get_user_org_id()
    );

-- DELETE: Apenas ADMIN pode remover perfis
CREATE POLICY "operium_profiles_delete_admin" ON operium_profiles
    FOR DELETE
    USING (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    );

-- ============================================================================
-- SEÇÃO 5: POLICIES DE RLS - VEHICLES
-- ============================================================================

-- SELECT: Todos podem ver veículos da sua organização
CREATE POLICY "operium_vehicles_select_own_org" ON operium_vehicles
    FOR SELECT
    USING (org_id = operium_get_user_org_id());

-- INSERT: Apenas ADMIN pode cadastrar veículos
CREATE POLICY "operium_vehicles_insert_admin" ON operium_vehicles
    FOR INSERT
    WITH CHECK (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    );

-- UPDATE: Apenas ADMIN pode atualizar cadastro de veículos
CREATE POLICY "operium_vehicles_update_admin" ON operium_vehicles
    FOR UPDATE
    USING (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    )
    WITH CHECK (
        org_id = operium_get_user_org_id()
    );

-- DELETE: Apenas ADMIN pode remover veículos
CREATE POLICY "operium_vehicles_delete_admin" ON operium_vehicles
    FOR DELETE
    USING (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    );

-- ============================================================================
-- SEÇÃO 6: POLICIES DE RLS - INVENTORY_ITEMS
-- ============================================================================

-- SELECT: Todos podem ver itens da sua organização
CREATE POLICY "operium_inventory_select_own_org" ON operium_inventory_items
    FOR SELECT
    USING (org_id = operium_get_user_org_id());

-- INSERT: Apenas ADMIN pode cadastrar itens
CREATE POLICY "operium_inventory_insert_admin" ON operium_inventory_items
    FOR INSERT
    WITH CHECK (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    );

-- UPDATE: ADMIN e WAREHOUSE podem atualizar quantidade
-- WAREHOUSE precisa atualizar quantidade ao registrar entrada/saída
CREATE POLICY "operium_inventory_update_admin_warehouse" ON operium_inventory_items
    FOR UPDATE
    USING (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() IN ('ADMIN', 'WAREHOUSE')
    )
    WITH CHECK (
        org_id = operium_get_user_org_id()
    );

-- DELETE: Apenas ADMIN pode remover itens
CREATE POLICY "operium_inventory_delete_admin" ON operium_inventory_items
    FOR DELETE
    USING (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
    );

-- ============================================================================
-- SEÇÃO 7: POLICIES DE RLS - EVENTS (IMUTÁVEIS)
-- ============================================================================
-- Eventos são APPEND-ONLY: não existe UPDATE ou DELETE

-- SELECT: Todos podem ver eventos da sua organização
CREATE POLICY "operium_events_select_own_org" ON operium_events
    FOR SELECT
    USING (org_id = operium_get_user_org_id());

-- INSERT: ADMIN pode inserir qualquer tipo de evento
CREATE POLICY "operium_events_insert_admin" ON operium_events
    FOR INSERT
    WITH CHECK (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'ADMIN'
        AND actor_user_id = auth.uid()
    );

-- INSERT: FIELD pode inserir apenas VEHICLE_EXPENSE e VEHICLE_STATUS
CREATE POLICY "operium_events_insert_field" ON operium_events
    FOR INSERT
    WITH CHECK (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'FIELD'
        AND type IN ('VEHICLE_EXPENSE', 'VEHICLE_STATUS')
        AND actor_user_id = auth.uid()
    );

-- INSERT: WAREHOUSE pode inserir apenas ITEM_IN e ITEM_OUT
CREATE POLICY "operium_events_insert_warehouse" ON operium_events
    FOR INSERT
    WITH CHECK (
        org_id = operium_get_user_org_id() 
        AND operium_get_user_role() = 'WAREHOUSE'
        AND type IN ('ITEM_IN', 'ITEM_OUT')
        AND actor_user_id = auth.uid()
    );

-- NOTA: Não existem policies de UPDATE ou DELETE para operium_events
-- Isso garante que eventos são IMUTÁVEIS (append-only)
-- Qualquer tentativa de UPDATE ou DELETE será bloqueada pelo RLS

-- ============================================================================
-- SEÇÃO 8: GRANT DE PERMISSÕES
-- ============================================================================
-- Garantir que authenticated users podem acessar as funções

GRANT EXECUTE ON FUNCTION operium_get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION operium_get_user_org_id TO authenticated;

-- ============================================================================
-- SEÇÃO 9: COMENTÁRIOS FINAIS E DOCUMENTAÇÃO
-- ============================================================================

/*
================================================================================
RESUMO DO SISTEMA DE CONTROLE DE ACESSO OPERIUM
================================================================================

PAPÉIS E PERMISSÕES:

┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   Tabela    │   SELECT    │   INSERT    │   UPDATE    │   DELETE    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ profiles    │ TODOS       │ ADMIN       │ ADMIN       │ ADMIN       │
│ vehicles    │ TODOS       │ ADMIN       │ ADMIN       │ ADMIN       │
│ inventory   │ TODOS       │ ADMIN       │ ADMIN+WAREH │ ADMIN       │
│ events      │ TODOS       │ *Ver abaixo │ NINGUÉM     │ NINGUÉM     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

*EVENTS INSERT:
- ADMIN: Todos os tipos
- FIELD: VEHICLE_EXPENSE, VEHICLE_STATUS
- WAREHOUSE: ITEM_IN, ITEM_OUT

================================================================================
COMO TESTAR CADA PAPEL
================================================================================

1. TESTAR ADMIN:
----------------
-- Criar um usuário admin (via Supabase Auth)
-- Inserir profile com role='ADMIN'

INSERT INTO operium_profiles (user_id, org_id, role) 
VALUES ('<admin_user_id>', '<org_id>', 'ADMIN');

-- Admin deve conseguir:
-- ✓ Criar/editar/deletar veículos
-- ✓ Criar/editar/deletar itens
-- ✓ Criar qualquer tipo de evento
-- ✓ Ver todos os dados da organização


2. TESTAR FIELD:
----------------
-- Criar um usuário field
INSERT INTO operium_profiles (user_id, org_id, role) 
VALUES ('<field_user_id>', '<org_id>', 'FIELD');

-- Field deve conseguir:
-- ✓ Ver veículos da organização
-- ✓ Registrar VEHICLE_EXPENSE
-- ✓ Registrar VEHICLE_STATUS

-- Field NÃO deve conseguir:
-- ✗ Criar/editar veículos
-- ✗ Registrar ITEM_IN ou ITEM_OUT
-- ✗ Deletar qualquer evento


3. TESTAR WAREHOUSE:
--------------------
-- Criar um usuário warehouse
INSERT INTO operium_profiles (user_id, org_id, role) 
VALUES ('<warehouse_user_id>', '<org_id>', 'WAREHOUSE');

-- Warehouse deve conseguir:
-- ✓ Ver itens da organização
-- ✓ Atualizar quantidade de itens
-- ✓ Registrar ITEM_IN
-- ✓ Registrar ITEM_OUT

-- Warehouse NÃO deve conseguir:
-- ✗ Criar/deletar itens
-- ✗ Registrar VEHICLE_EXPENSE ou VEHICLE_STATUS
-- ✗ Deletar qualquer evento


4. TESTAR IMUTABILIDADE DE EVENTOS:
-----------------------------------
-- Qualquer usuário tentando:

UPDATE operium_events SET metadata = '{"hack": true}' WHERE id = '<event_id>';
-- Resultado esperado: 0 rows affected (bloqueado pelo RLS)

DELETE FROM operium_events WHERE id = '<event_id>';
-- Resultado esperado: 0 rows affected (bloqueado pelo RLS)


5. TESTAR ISOLAMENTO MULTI-TENANT:
----------------------------------
-- Usuário de org_id 'A' não deve ver dados de org_id 'B'
-- Mesmo sendo ADMIN, só vê dados da própria organização

================================================================================
EXEMPLOS DE EVENTOS
================================================================================

-- Despesa de veículo (FIELD ou ADMIN):
INSERT INTO operium_events (org_id, type, actor_user_id, target_id, metadata)
VALUES (
    operium_get_user_org_id(),
    'VEHICLE_EXPENSE',
    auth.uid(),
    '<vehicle_id>',
    '{"valor": 150.00, "tipo": "combustivel", "foto_nf": "storage://..."}'
);

-- Entrada de item (WAREHOUSE ou ADMIN):
INSERT INTO operium_events (org_id, type, actor_user_id, target_id, metadata)
VALUES (
    operium_get_user_org_id(),
    'ITEM_IN',
    auth.uid(),
    '<item_id>',
    '{"quantidade": 10, "fornecedor": "ABC Ltda", "nf": "12345"}'
);

-- Saída de item (WAREHOUSE ou ADMIN):
INSERT INTO operium_events (org_id, type, actor_user_id, target_id, metadata)
VALUES (
    operium_get_user_org_id(),
    'ITEM_OUT',
    auth.uid(),
    '<item_id>',
    '{"quantidade": 5, "colaborador_id": "<uuid>", "motivo": "obra X"}'
);

================================================================================
*/
