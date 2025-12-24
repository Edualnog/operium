-- Migration: 112_fix_function_search_path.sql
-- Purpose: Fix security warnings by setting search_path on functions
-- This prevents search_path injection attacks

-- Fix fn_inventario_ajuste_create_movimentacao
CREATE OR REPLACE FUNCTION public.fn_inventario_ajuste_create_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
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
        FROM public.inventario_itens ii
        JOIN public.inventarios i ON i.id = ii.inventario_id
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
        INSERT INTO public.movimentacoes (
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
            NEW.diferenca,
            FORMAT('Ajuste de inventário #%s - %s: %s',
                v_inventario_id,
                v_motivo_texto,
                COALESCE(NEW.observacao, 'Sem observação')
            ),
            NOW()
        );

        -- Also update the ferramenta quantity
        UPDATE public.ferramentas
        SET quantidade_disponivel = quantidade_disponivel + NEW.diferenca,
            quantidade_total = quantidade_total + NEW.diferenca,
            updated_at = NOW()
        WHERE id = v_ferramenta_id;

        RAISE NOTICE 'Created movimentacao for inventario ajuste: ferramenta=%, diferenca=%',
            v_ferramenta_id, NEW.diferenca;
    END IF;

    RETURN NEW;
END;
$$;

-- Fix fn_sync_conserto_to_ferramenta_estado
CREATE OR REPLACE FUNCTION public.fn_sync_conserto_to_ferramenta_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_consertos_em_aberto INTEGER;
    v_novo_estado TEXT;
BEGIN
    -- Only process relevant status changes
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN

        -- Count open consertos for this ferramenta (excluding current if completed)
        SELECT COUNT(*)
        INTO v_consertos_em_aberto
        FROM public.consertos
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
            v_novo_estado := 'ok';
        END IF;

        -- Update ferramenta estado
        UPDATE public.ferramentas
        SET estado = v_novo_estado,
            updated_at = NOW()
        WHERE id = NEW.ferramenta_id;

        RAISE NOTICE 'Synced ferramenta % estado to % (open consertos: %)',
            NEW.ferramenta_id, v_novo_estado, v_consertos_em_aberto;
    END IF;

    RETURN NEW;
END;
$$;

-- Fix fn_sync_conserto_delete_to_ferramenta_estado
CREATE OR REPLACE FUNCTION public.fn_sync_conserto_delete_to_ferramenta_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_consertos_em_aberto INTEGER;
    v_novo_estado TEXT;
BEGIN
    -- Count remaining open consertos for this ferramenta
    SELECT COUNT(*)
    INTO v_consertos_em_aberto
    FROM public.consertos
    WHERE ferramenta_id = OLD.ferramenta_id
      AND status IN ('aguardando', 'em_andamento');

    -- Determine new estado
    IF v_consertos_em_aberto > 0 THEN
        v_novo_estado := 'em_conserto';
    ELSE
        v_novo_estado := 'ok';
    END IF;

    -- Update ferramenta estado
    UPDATE public.ferramentas
    SET estado = v_novo_estado,
        updated_at = NOW()
    WHERE id = OLD.ferramenta_id;

    RETURN OLD;
END;
$$;
