-- Migration: 145_sync_movimentacoes_to_stock.sql
-- Purpose: Update ferramentas.quantidade_disponivel when movimentacoes happen
-- This fixes the dashboard showing incorrect availability percentages

-- ============================================================================
-- 1. FUNCTION: Update stock when movimentacao happens
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_movimentacoes_update_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_item TEXT;
BEGIN
    -- Get tipo_item from ferramenta
    SELECT tipo_item INTO v_tipo_item
    FROM public.ferramentas
    WHERE id = NEW.ferramenta_id;
    
    -- Only update stock for ferramentas (not consumíveis or EPIs)
    -- Consumíveis are consumed, not returned
    IF v_tipo_item = 'ferramenta' THEN
        
        IF NEW.tipo = 'retirada' THEN
            -- Decrement available stock
            UPDATE public.ferramentas
            SET 
                quantidade_disponivel = quantidade_disponivel - NEW.quantidade,
                updated_at = NOW()
            WHERE id = NEW.ferramenta_id;
            
            RAISE NOTICE 'Stock decremented: ferramenta_id=%, qty=%, new_disponivel=%', 
                NEW.ferramenta_id, NEW.quantidade, 
                (SELECT quantidade_disponivel FROM public.ferramentas WHERE id = NEW.ferramenta_id);
            
        ELSIF NEW.tipo = 'devolucao' THEN
            -- Increment available stock
            UPDATE public.ferramentas
            SET 
                quantidade_disponivel = quantidade_disponivel + NEW.quantidade,
                updated_at = NOW()
            WHERE id = NEW.ferramenta_id;
            
            RAISE NOTICE 'Stock incremented: ferramenta_id=%, qty=%, new_disponivel=%', 
                NEW.ferramenta_id, NEW.quantidade,
                (SELECT quantidade_disponivel FROM public.ferramentas WHERE id = NEW.ferramenta_id);
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 2. CREATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trg_movimentacoes_update_stock ON public.movimentacoes;

CREATE TRIGGER trg_movimentacoes_update_stock
    AFTER INSERT ON public.movimentacoes
    FOR EACH ROW
    WHEN (NEW.tipo IN ('retirada', 'devolucao'))
    EXECUTE FUNCTION public.fn_movimentacoes_update_stock();

-- ============================================================================
-- 3. RECALCULATE quantidade_disponivel for existing data
-- ============================================================================

-- This script recalculates quantidade_disponivel based on:
-- - quantidade_total (base)
-- - minus: team_equipment not returned
-- - minus: movimentacoes retiradas not devolved
-- - minus: consertos ativos

DO $$
DECLARE
    v_ferramenta RECORD;
    v_total INTEGER;
    v_team_equipment_in_use INTEGER;
    v_movimentacoes_in_use INTEGER;
    v_new_disponivel INTEGER;
BEGIN
    RAISE NOTICE 'Recalculating quantidade_disponivel for all ferramentas...';
    
    FOR v_ferramenta IN 
        SELECT id, nome, quantidade_total, quantidade_disponivel, tipo_item
        FROM public.ferramentas
        WHERE tipo_item = 'ferramenta'
    LOOP
        v_total := v_ferramenta.quantidade_total;
        
        -- Calculate team_equipment in use (not returned)
        SELECT COALESCE(SUM(quantity), 0) INTO v_team_equipment_in_use
        FROM public.team_equipment
        WHERE ferramenta_id = v_ferramenta.id
          AND returned_at IS NULL;
        
        -- Calculate movimentacoes in use (retiradas - devoluções)
        WITH retiradas AS (
            SELECT COALESCE(SUM(quantidade), 0) as total
            FROM public.movimentacoes
            WHERE ferramenta_id = v_ferramenta.id
              AND tipo = 'retirada'
        ),
        devolucoes AS (
            SELECT COALESCE(SUM(quantidade), 0) as total
            FROM public.movimentacoes
            WHERE ferramenta_id = v_ferramenta.id
              AND tipo = 'devolucao'
        )
        SELECT (r.total - d.total) INTO v_movimentacoes_in_use
        FROM retiradas r, devolucoes d;
        
        -- Calculate new disponivel
        -- Formula: total - team_equipment_in_use - movimentacoes_in_use
        v_new_disponivel := v_total - v_team_equipment_in_use - v_movimentacoes_in_use;
        
        -- Ensure disponivel is not negative
        v_new_disponivel := GREATEST(0, v_new_disponivel);
        
        -- Ensure disponivel is not greater than total
        v_new_disponivel := LEAST(v_new_disponivel, v_total);
        
        -- Update if different
        IF v_new_disponivel != v_ferramenta.quantidade_disponivel THEN
            UPDATE public.ferramentas
            SET quantidade_disponivel = v_new_disponivel,
                updated_at = NOW()
            WHERE id = v_ferramenta.id;
            
            RAISE NOTICE 'Updated %: old=%, new=% (total=%, team_eq=%, mov=%)', 
                v_ferramenta.nome,
                v_ferramenta.quantidade_disponivel,
                v_new_disponivel,
                v_total,
                v_team_equipment_in_use,
                v_movimentacoes_in_use;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Recalculation complete!';
END;
$$;

-- ============================================================================
-- 4. ADD COMMENT
-- ============================================================================

COMMENT ON FUNCTION public.fn_movimentacoes_update_stock() IS
'Automatically updates ferramentas.quantidade_disponivel when movimentacoes (retirada/devolucao) happen.
This ensures the dashboard shows correct availability percentages.
Only applies to tipo_item = ferramenta (not consumíveis or EPIs).';

COMMENT ON TRIGGER trg_movimentacoes_update_stock ON public.movimentacoes IS
'Keeps ferramentas.quantidade_disponivel in sync with movimentacoes.
Decrements on retirada, increments on devolucao.';
