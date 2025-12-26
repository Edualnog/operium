-- =====================================================
-- FIX: Vehicle Sync Triggers
-- Corrige 2 bugs críticos nos triggers de sincronização:
-- 1. sync_vehicle_expense_to_costs usava coluna inexistente 'profile_id'
-- 2. sync_vehicle_events_to_usage procurava tipo errado e campos errados
-- =====================================================

-- =====================================================
-- FIX 1: sync_vehicle_expense_to_costs
-- Bug: Migração 124 usava 'profile_id' que não existe na tabela
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_vehicle_expense_to_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_name TEXT;
    v_team_id UUID;
BEGIN
    -- Só processa eventos VEHICLE_EXPENSE
    IF NEW.type != 'VEHICLE_EXPENSE' THEN
        RETURN NEW;
    END IF;

    -- Busca nome e team_id do usuário
    SELECT COALESCE(op.name, u.email), op.team_id
    INTO v_user_name, v_team_id
    FROM operium_profiles op
    LEFT JOIN auth.users u ON u.id = op.user_id
    WHERE op.user_id = NEW.actor_user_id
    AND op.active = true
    LIMIT 1;

    -- Se não encontrar perfil, ainda insere o custo (sem team_id)
    IF v_team_id IS NULL THEN
        SELECT team_id INTO v_team_id
        FROM operium_profiles
        WHERE user_id = NEW.actor_user_id
        LIMIT 1;
    END IF;

    -- Insere na vehicle_costs
    INSERT INTO vehicle_costs (
        vehicle_id,
        cost_type,
        amount,
        notes,
        reference_month,
        receipt_url,
        team_id,
        collaborator_id,
        registered_by_user_id,
        registered_by_name,
        created_at
    ) VALUES (
        NEW.target_id,
        COALESCE(NEW.metadata->>'tipo', 'outros'),
        (NEW.metadata->>'valor')::NUMERIC,
        NEW.metadata->>'observacoes',
        DATE_TRUNC('month', NEW.created_at)::DATE,
        NEW.metadata->>'foto_nf',
        v_team_id,
        NEW.actor_user_id,
        NEW.actor_user_id,
        v_user_name,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- =====================================================
-- FIX 2: sync_vehicle_events_to_usage
-- Bugs:
--   - Linha 19/86: procurava 'VEHICLE_STATUS_UPDATE' mas tipo correto é 'VEHICLE_STATUS'
--   - Linha 47: procurava 'new_status'/'status' mas campo correto é 'status_novo'
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_vehicle_events_to_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_name TEXT;
    v_event_type TEXT;
    v_notes TEXT;
BEGIN
    -- Só processa eventos de veículo (CORRIGIDO: VEHICLE_STATUS, não VEHICLE_STATUS_UPDATE)
    IF NEW.type NOT IN ('VEHICLE_EXPENSE', 'VEHICLE_STATUS') THEN
        RETURN NEW;
    END IF;

    -- Busca nome do usuário
    SELECT COALESCE(op.name, 'Sistema')
    INTO v_user_name
    FROM operium_profiles op
    WHERE op.user_id = NEW.actor_user_id
    LIMIT 1;

    -- Define tipo e notas baseado no evento
    IF NEW.type = 'VEHICLE_EXPENSE' THEN
        v_event_type := 'DESPESA';
        v_notes := CONCAT(
            UPPER(COALESCE(NEW.metadata->>'tipo', 'outros')),
            ' - R$ ',
            NEW.metadata->>'valor',
            CASE
                WHEN NEW.metadata->>'observacoes' IS NOT NULL AND NEW.metadata->>'observacoes' != ''
                THEN CONCAT(' (', NEW.metadata->>'observacoes', ')')
                ELSE ''
            END
        );
    ELSIF NEW.type = 'VEHICLE_STATUS' THEN
        v_event_type := 'STATUS';
        -- CORRIGIDO: usa 'status_novo' em vez de 'new_status'/'status'
        v_notes := CONCAT(
            'Status alterado para: ',
            UPPER(COALESCE(NEW.metadata->>'status_novo', '?')),
            CASE
                WHEN NEW.metadata->>'observacoes' IS NOT NULL AND NEW.metadata->>'observacoes' != ''
                THEN CONCAT(' - ', NEW.metadata->>'observacoes')
                ELSE ''
            END
        );
    END IF;

    -- Insere evento de uso
    INSERT INTO vehicle_usage_events (
        vehicle_id,
        collaborator_id,
        usage_type,
        usage_date,
        notes
    )
    SELECT
        NEW.target_id,
        c.id,
        v_event_type,
        NEW.created_at,
        v_notes
    FROM operium_profiles op
    LEFT JOIN colaboradores c ON c.profile_id = op.user_id
    WHERE op.user_id = NEW.actor_user_id
    LIMIT 1;

    RETURN NEW;
END;
$$;

-- =====================================================
-- Recria triggers com condições corrigidas
-- =====================================================

-- Trigger para vehicle_costs (já existe, apenas recria para garantir)
DROP TRIGGER IF EXISTS trigger_sync_vehicle_expense ON operium_events;
CREATE TRIGGER trigger_sync_vehicle_expense
    AFTER INSERT ON operium_events
    FOR EACH ROW
    WHEN (NEW.type = 'VEHICLE_EXPENSE')
    EXECUTE FUNCTION sync_vehicle_expense_to_costs();

-- Trigger para vehicle_usage_events (CORRIGIDO: VEHICLE_STATUS, não VEHICLE_STATUS_UPDATE)
DROP TRIGGER IF EXISTS trigger_sync_vehicle_usage ON operium_events;
CREATE TRIGGER trigger_sync_vehicle_usage
    AFTER INSERT ON operium_events
    FOR EACH ROW
    WHEN (NEW.type IN ('VEHICLE_EXPENSE', 'VEHICLE_STATUS'))
    EXECUTE FUNCTION sync_vehicle_events_to_usage();

-- =====================================================
-- Comentários atualizados
-- =====================================================
COMMENT ON FUNCTION public.sync_vehicle_expense_to_costs() IS
'Sincroniza eventos VEHICLE_EXPENSE para vehicle_costs. Corrigido para não usar coluna inexistente profile_id.';

COMMENT ON FUNCTION public.sync_vehicle_events_to_usage() IS
'Sincroniza eventos de veículo (VEHICLE_EXPENSE, VEHICLE_STATUS) para vehicle_usage_events. Corrigido para usar tipo VEHICLE_STATUS e campo status_novo.';

-- =====================================================
-- REPROCESSAR EVENTOS ANTIGOS
-- Sincroniza eventos que não foram processados devido aos bugs
-- =====================================================

-- 1. Reprocessar VEHICLE_EXPENSE para vehicle_costs (eventos que falharam)
INSERT INTO vehicle_costs (
    vehicle_id,
    cost_type,
    amount,
    notes,
    reference_month,
    receipt_url,
    team_id,
    collaborator_id,
    registered_by_user_id,
    registered_by_name,
    created_at
)
SELECT
    oe.target_id,
    COALESCE(oe.metadata->>'tipo', 'outros'),
    (oe.metadata->>'valor')::NUMERIC,
    oe.metadata->>'observacoes',
    DATE_TRUNC('month', oe.created_at)::DATE,
    oe.metadata->>'foto_nf',
    op.team_id,
    oe.actor_user_id,
    oe.actor_user_id,
    COALESCE(op.name, u.email),
    oe.created_at
FROM operium_events oe
LEFT JOIN operium_profiles op ON op.user_id = oe.actor_user_id
LEFT JOIN auth.users u ON u.id = oe.actor_user_id
WHERE oe.type = 'VEHICLE_EXPENSE'
AND NOT EXISTS (
    SELECT 1 FROM vehicle_costs vc
    WHERE vc.vehicle_id = oe.target_id
    AND vc.created_at = oe.created_at
    AND vc.amount = (oe.metadata->>'valor')::NUMERIC
);

-- 2. Reprocessar VEHICLE_EXPENSE para vehicle_usage_events
INSERT INTO vehicle_usage_events (
    vehicle_id,
    collaborator_id,
    usage_type,
    usage_date,
    notes
)
SELECT
    oe.target_id,
    c.id,
    'DESPESA',
    oe.created_at,
    CONCAT(
        UPPER(COALESCE(oe.metadata->>'tipo', 'outros')),
        ' - R$ ',
        oe.metadata->>'valor',
        CASE
            WHEN oe.metadata->>'observacoes' IS NOT NULL AND oe.metadata->>'observacoes' != ''
            THEN CONCAT(' (', oe.metadata->>'observacoes', ')')
            ELSE ''
        END
    )
FROM operium_events oe
LEFT JOIN operium_profiles op ON op.user_id = oe.actor_user_id
LEFT JOIN colaboradores c ON c.profile_id = op.user_id
WHERE oe.type = 'VEHICLE_EXPENSE'
AND NOT EXISTS (
    SELECT 1 FROM vehicle_usage_events vue
    WHERE vue.vehicle_id = oe.target_id
    AND vue.usage_date = oe.created_at
    AND vue.usage_type = 'DESPESA'
);

-- 3. Reprocessar VEHICLE_STATUS para vehicle_usage_events
INSERT INTO vehicle_usage_events (
    vehicle_id,
    collaborator_id,
    usage_type,
    usage_date,
    notes
)
SELECT
    oe.target_id,
    c.id,
    'STATUS',
    oe.created_at,
    CONCAT(
        'Status alterado para: ',
        UPPER(COALESCE(oe.metadata->>'status_novo', '?')),
        CASE
            WHEN oe.metadata->>'observacoes' IS NOT NULL AND oe.metadata->>'observacoes' != ''
            THEN CONCAT(' - ', oe.metadata->>'observacoes')
            ELSE ''
        END
    )
FROM operium_events oe
LEFT JOIN operium_profiles op ON op.user_id = oe.actor_user_id
LEFT JOIN colaboradores c ON c.profile_id = op.user_id
WHERE oe.type = 'VEHICLE_STATUS'
AND NOT EXISTS (
    SELECT 1 FROM vehicle_usage_events vue
    WHERE vue.vehicle_id = oe.target_id
    AND vue.usage_date = oe.created_at
    AND vue.usage_type = 'STATUS'
);
