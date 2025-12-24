-- Migration: 111_inventario_ajustes_create_movimentacao.sql
-- Purpose: Create movimentacao record when inventario_ajustes.aplicado is set to true
-- This ensures all stock changes are traceable through movimentacoes

-- Function to create movimentacao when ajuste is applied
CREATE OR REPLACE FUNCTION fn_inventario_ajuste_create_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
    v_ferramenta_id UUID;
    v_profile_id UUID;
    v_inventario_id UUID;
    v_motivo_texto TEXT;
BEGIN
    -- Only trigger when aplicado changes from false to true
    IF NEW.aplicado = TRUE AND (OLD.aplicado IS NULL OR OLD.aplicado = FALSE) THEN

        -- Get ferramenta_id and profile_id from inventario_itens and inventarios
        SELECT
            ii.ferramenta_id,
            i.profile_id,
            i.id
        INTO
            v_ferramenta_id,
            v_profile_id,
            v_inventario_id
        FROM inventario_itens ii
        JOIN inventarios i ON i.id = ii.inventario_id
        WHERE ii.id = NEW.inventario_item_id;

        -- Build motivo text for observacoes
        v_motivo_texto := CASE NEW.motivo
            WHEN 'perda_avaria' THEN 'Perda/Avaria'
            WHEN 'furto_extravio' THEN 'Furto/Extravio'
            WHEN 'erro_lancamento' THEN 'Erro de Lançamento'
            WHEN 'vencimento_descarte' THEN 'Vencimento/Descarte'
            WHEN 'transferencia' THEN 'Transferência'
            ELSE 'Outro'
        END;

        -- Create movimentacao with tipo 'ajuste'
        INSERT INTO movimentacoes (
            profile_id,
            ferramenta_id,
            tipo,
            quantidade,
            observacoes,
            data
        ) VALUES (
            v_profile_id,
            v_ferramenta_id,
            'ajuste',
            NEW.diferenca,  -- Can be positive or negative
            FORMAT('Ajuste de inventário #%s - %s: %s',
                v_inventario_id,
                v_motivo_texto,
                COALESCE(NEW.observacao, 'Sem observação')
            ),
            NOW()
        );

        -- Also update the ferramenta quantity
        UPDATE ferramentas
        SET quantidade_disponivel = quantidade_disponivel + NEW.diferenca,
            quantidade_total = quantidade_total + NEW.diferenca,
            updated_at = NOW()
        WHERE id = v_ferramenta_id;

        RAISE NOTICE 'Created movimentacao for inventario ajuste: ferramenta=%, diferenca=%',
            v_ferramenta_id, NEW.diferenca;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_inventario_ajuste_movimentacao ON inventario_ajustes;
CREATE TRIGGER trg_inventario_ajuste_movimentacao
    AFTER UPDATE OF aplicado ON inventario_ajustes
    FOR EACH ROW
    EXECUTE FUNCTION fn_inventario_ajuste_create_movimentacao();

-- Also handle INSERT with aplicado=true directly
DROP TRIGGER IF EXISTS trg_inventario_ajuste_insert_movimentacao ON inventario_ajustes;
CREATE TRIGGER trg_inventario_ajuste_insert_movimentacao
    AFTER INSERT ON inventario_ajustes
    FOR EACH ROW
    WHEN (NEW.aplicado = TRUE)
    EXECUTE FUNCTION fn_inventario_ajuste_create_movimentacao();

-- Add comment
COMMENT ON FUNCTION fn_inventario_ajuste_create_movimentacao() IS
'Creates a movimentacao record when an inventory adjustment is applied.
This ensures all stock changes are properly tracked and auditable.
The movimentacao.quantidade reflects the diferenca (positive or negative).';
