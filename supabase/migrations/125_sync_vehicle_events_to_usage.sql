-- =====================================================
-- SYNC: Vehicle Events from operium_events to vehicle_usage_events
-- Registra status updates e despesas como eventos de uso
-- =====================================================

-- Trigger para sincronizar eventos de veículo para a tabela de uso
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
    -- Só processa eventos de veículo
    IF NEW.type NOT IN ('VEHICLE_EXPENSE', 'VEHICLE_STATUS_UPDATE') THEN
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
    ELSIF NEW.type = 'VEHICLE_STATUS_UPDATE' THEN
        v_event_type := 'STATUS';
        v_notes := CONCAT(
            'Status alterado para: ',
            UPPER(COALESCE(NEW.metadata->>'new_status', NEW.metadata->>'status', '?')),
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
    LEFT JOIN colaboradores c ON c.user_id = op.user_id
    WHERE op.user_id = NEW.actor_user_id
    LIMIT 1;

    RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_sync_vehicle_usage ON operium_events;

-- Cria trigger para sincronizar eventos
CREATE TRIGGER trigger_sync_vehicle_usage
AFTER INSERT ON operium_events
FOR EACH ROW
WHEN (NEW.type IN ('VEHICLE_EXPENSE', 'VEHICLE_STATUS_UPDATE'))
EXECUTE FUNCTION sync_vehicle_events_to_usage();

-- Comentário
COMMENT ON FUNCTION public.sync_vehicle_events_to_usage() IS 
'Sincroniza eventos de veículo (despesas e status) para a tabela vehicle_usage_events para exibição na aba Uso';
