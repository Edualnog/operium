-- ============================================================================
-- FIX: Performance Advisor Warnings para operium_events
-- ============================================================================
-- Problemas:
-- 1. Multiple Permissive Policies na tabela operium_events
-- 2. Auth RLS Initialization Plan (múltiplas chamadas auth.*)
--
-- Solução: Consolidar as 3 policies de INSERT em uma única policy

-- Dropar as policies existentes de INSERT
DROP POLICY IF EXISTS "operium_events_insert_admin" ON operium_events;
DROP POLICY IF EXISTS "operium_events_insert_field" ON operium_events;
DROP POLICY IF EXISTS "operium_events_insert_warehouse" ON operium_events;

-- Policy consolidada: Uma única policy que verifica o papel e tipo de evento
CREATE POLICY "operium_events_insert" ON operium_events
    FOR INSERT
    WITH CHECK (
        -- Deve ser da mesma organização e o actor deve ser o usuário atual
        org_id = operium_get_user_org_id()
        AND actor_user_id = auth.uid()
        AND (
            -- ADMIN pode inserir qualquer tipo
            operium_get_user_role() = 'ADMIN'
            OR
            -- FIELD pode inserir apenas tipos de veículo
            (
                operium_get_user_role() = 'FIELD' 
                AND type IN ('VEHICLE_EXPENSE', 'VEHICLE_STATUS')
            )
            OR
            -- WAREHOUSE pode inserir apenas tipos de inventário
            (
                operium_get_user_role() = 'WAREHOUSE' 
                AND type IN ('ITEM_IN', 'ITEM_OUT')
            )
        )
    );

COMMENT ON POLICY "operium_events_insert" ON operium_events IS 
    'Policy consolidada: ADMIN=todos, FIELD=veículos, WAREHOUSE=inventário';
