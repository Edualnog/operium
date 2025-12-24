-- Migration: 110_sync_consertos_ferramentas_estado.sql
-- Purpose: Synchronize ferramentas.estado with consertos.status changes
-- When a conserto status changes, update the corresponding ferramenta.estado

-- Function to sync ferramenta estado when conserto status changes
CREATE OR REPLACE FUNCTION fn_sync_conserto_to_ferramenta_estado()
RETURNS TRIGGER AS $$
DECLARE
    v_consertos_em_aberto INTEGER;
    v_novo_estado TEXT;
BEGIN
    -- Only process relevant status changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN

        -- Count open consertos for this ferramenta (excluding current if completed)
        SELECT COUNT(*)
        INTO v_consertos_em_aberto
        FROM consertos
        WHERE ferramenta_id = NEW.ferramenta_id
          AND status IN ('aguardando', 'em_andamento')
          AND id != NEW.id;

        -- If current conserto is being set to aguardando/em_andamento, include it
        IF NEW.status IN ('aguardando', 'em_andamento') THEN
            v_consertos_em_aberto := v_consertos_em_aberto + 1;
        END IF;

        -- Determine new estado
        IF v_consertos_em_aberto > 0 THEN
            v_novo_estado := 'em_conserto';
        ELSE
            -- No open consertos, set to ok (unless manually set to danificada)
            v_novo_estado := 'ok';
        END IF;

        -- Update ferramenta estado
        UPDATE ferramentas
        SET estado = v_novo_estado,
            updated_at = NOW()
        WHERE id = NEW.ferramenta_id;

        RAISE NOTICE 'Synced ferramenta % estado to % (open consertos: %)',
            NEW.ferramenta_id, v_novo_estado, v_consertos_em_aberto;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for consertos INSERT
DROP TRIGGER IF EXISTS trg_sync_conserto_insert ON consertos;
CREATE TRIGGER trg_sync_conserto_insert
    AFTER INSERT ON consertos
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_conserto_to_ferramenta_estado();

-- Create trigger for consertos UPDATE
DROP TRIGGER IF EXISTS trg_sync_conserto_update ON consertos;
CREATE TRIGGER trg_sync_conserto_update
    AFTER UPDATE OF status ON consertos
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_conserto_to_ferramenta_estado();

-- Handle DELETE: when a conserto is deleted, recheck the ferramenta estado
CREATE OR REPLACE FUNCTION fn_sync_conserto_delete_to_ferramenta_estado()
RETURNS TRIGGER AS $$
DECLARE
    v_consertos_em_aberto INTEGER;
    v_novo_estado TEXT;
BEGIN
    -- Count remaining open consertos for this ferramenta
    SELECT COUNT(*)
    INTO v_consertos_em_aberto
    FROM consertos
    WHERE ferramenta_id = OLD.ferramenta_id
      AND status IN ('aguardando', 'em_andamento');

    -- Determine new estado
    IF v_consertos_em_aberto > 0 THEN
        v_novo_estado := 'em_conserto';
    ELSE
        v_novo_estado := 'ok';
    END IF;

    -- Update ferramenta estado
    UPDATE ferramentas
    SET estado = v_novo_estado,
        updated_at = NOW()
    WHERE id = OLD.ferramenta_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_conserto_delete ON consertos;
CREATE TRIGGER trg_sync_conserto_delete
    AFTER DELETE ON consertos
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_conserto_delete_to_ferramenta_estado();

-- Add comment explaining the sync logic
COMMENT ON FUNCTION fn_sync_conserto_to_ferramenta_estado() IS
'Synchronizes ferramentas.estado based on consertos.status changes.
If any conserto is aguardando or em_andamento, ferramenta.estado becomes em_conserto.
When all consertos are concluido or deleted, ferramenta.estado becomes ok.';
