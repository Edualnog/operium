-- Migration: 085_team_equipment_stock_integration.sql
-- Description: Integrate team equipment assignments with stock (ferramentas.quantidade_disponivel)
-- Author: AI Assistant
-- Date: 2024-12-23
-- 
-- This migration ensures that when equipment is assigned to a team, the stock is decremented,
-- and when equipment is returned, the stock is incremented back.
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER FUNCTION: DECREMENT STOCK ON EQUIPMENT ASSIGNMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_team_equipment_decrement_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_available INTEGER;
    v_ferramenta_nome TEXT;
BEGIN
    -- Only trigger on new assignments (INSERT)
    IF TG_OP = 'INSERT' THEN
        -- Get current available quantity and name
        SELECT quantidade_disponivel, nome 
        INTO v_available, v_ferramenta_nome
        FROM public.ferramentas 
        WHERE id = NEW.ferramenta_id;
        
        -- Validate sufficient stock
        IF v_available IS NULL THEN
            RAISE EXCEPTION 'Ferramenta não encontrada';
        END IF;
        
        IF v_available < NEW.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para "%". Disponível: %, Solicitado: %', 
                v_ferramenta_nome, v_available, NEW.quantity;
        END IF;
        
        -- Decrement available stock
        UPDATE public.ferramentas 
        SET quantidade_disponivel = quantidade_disponivel - NEW.quantity
        WHERE id = NEW.ferramenta_id;
        
        RAISE NOTICE 'Stock decremented: % qty % (new available: %)', 
            v_ferramenta_nome, NEW.quantity, v_available - NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 2. TRIGGER FUNCTION: INCREMENT STOCK ON EQUIPMENT RETURN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_team_equipment_increment_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_ferramenta_nome TEXT;
BEGIN
    -- Trigger on UPDATE when returned_at changes from NULL to a value
    IF TG_OP = 'UPDATE' THEN
        IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
            -- Get ferramenta name for logging
            SELECT nome INTO v_ferramenta_nome
            FROM public.ferramentas 
            WHERE id = NEW.ferramenta_id;
            
            -- Increment available stock (restore quantity)
            UPDATE public.ferramentas 
            SET quantidade_disponivel = quantidade_disponivel + NEW.quantity
            WHERE id = NEW.ferramenta_id;
            
            RAISE NOTICE 'Stock incremented: % qty % returned', 
                v_ferramenta_nome, NEW.quantity;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 3. TRIGGER FUNCTION: HANDLE DELETE (RESTORE STOCK IF NOT RETURNED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_team_equipment_handle_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- If deleting an assignment that was never returned, restore the stock
    IF OLD.returned_at IS NULL THEN
        UPDATE public.ferramentas 
        SET quantidade_disponivel = quantidade_disponivel + OLD.quantity
        WHERE id = OLD.ferramenta_id;
        
        RAISE NOTICE 'Stock restored on delete: qty %', OLD.quantity;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 4. CREATE TRIGGERS
-- ============================================================================

-- Drop existing triggers if any (clean slate)
DROP TRIGGER IF EXISTS trg_team_equipment_decrement_stock ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_team_equipment_increment_stock ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_team_equipment_handle_delete ON public.team_equipment;

-- Trigger: Decrement stock on INSERT
CREATE TRIGGER trg_team_equipment_decrement_stock
    BEFORE INSERT ON public.team_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_team_equipment_decrement_stock();

-- Trigger: Increment stock on UPDATE (when returned)
CREATE TRIGGER trg_team_equipment_increment_stock
    AFTER UPDATE ON public.team_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_team_equipment_increment_stock();

-- Trigger: Handle delete (restore stock if not returned)
CREATE TRIGGER trg_team_equipment_handle_delete
    BEFORE DELETE ON public.team_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_team_equipment_handle_delete();

-- ============================================================================
-- 5. SYNC EXISTING DATA (OPTIONAL - RECONCILE HISTORICAL ASSIGNMENTS)
-- ============================================================================

-- This CTE calculates how much stock is currently "in custody" (assigned but not returned)
-- and adjusts quantidade_disponivel accordingly.
-- 
-- NOTE: Run this ONCE after migration to sync existing data.
-- If your current quantidade_disponivel is already correct, you can skip this.

DO $$
DECLARE
    v_ferramenta RECORD;
    v_in_custody INTEGER;
BEGIN
    RAISE NOTICE 'Syncing stock with existing team equipment assignments...';
    
    FOR v_ferramenta IN 
        SELECT DISTINCT ferramenta_id 
        FROM public.team_equipment 
        WHERE returned_at IS NULL
    LOOP
        -- Calculate total quantity in custody
        SELECT COALESCE(SUM(quantity), 0) INTO v_in_custody
        FROM public.team_equipment
        WHERE ferramenta_id = v_ferramenta.ferramenta_id
          AND returned_at IS NULL;
        
        -- Ensure quantidade_disponivel reflects custody
        -- Formula: quantidade_disponivel = quantidade_total - quantity_in_custody
        -- But we don't want to break existing correct data, so we just log for now
        RAISE NOTICE 'Ferramenta %: % units currently in custody', 
            v_ferramenta.ferramenta_id, v_in_custody;
    END LOOP;
    
    RAISE NOTICE 'Sync check complete. Review notices above for any discrepancies.';
END;
$$;

-- ============================================================================
-- 6. ADD COMMENT
-- ============================================================================

COMMENT ON FUNCTION public.fn_team_equipment_decrement_stock() IS 
'Automatically decrements ferramentas.quantidade_disponivel when equipment is assigned to a team.';

COMMENT ON FUNCTION public.fn_team_equipment_increment_stock() IS 
'Automatically increments ferramentas.quantidade_disponivel when equipment is returned from a team.';

COMMENT ON FUNCTION public.fn_team_equipment_handle_delete() IS 
'Restores stock when a team equipment assignment is deleted (if not already returned).';

