-- ============================================================================
-- Migration 119: Add updated_at column to ferramentas table
-- Problem:
--   Triggers expect ferramentas.updated_at to exist but it doesn't
-- Solution:
--   Add the column and a trigger to auto-update it
-- ============================================================================

-- Add updated_at column to ferramentas
ALTER TABLE public.ferramentas 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create function to update timestamp (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update
DROP TRIGGER IF EXISTS trg_ferramentas_updated_at ON public.ferramentas;
CREATE TRIGGER trg_ferramentas_updated_at
    BEFORE UPDATE ON public.ferramentas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Also add to consertos and movimentacoes if they don't have it
ALTER TABLE public.consertos 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

ALTER TABLE public.movimentacoes 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create triggers for them too
DROP TRIGGER IF EXISTS trg_consertos_updated_at ON public.consertos;
CREATE TRIGGER trg_consertos_updated_at
    BEFORE UPDATE ON public.consertos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_movimentacoes_updated_at ON public.movimentacoes;
CREATE TRIGGER trg_movimentacoes_updated_at
    BEFORE UPDATE ON public.movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Also add to colaboradores
ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

DROP TRIGGER IF EXISTS trg_colaboradores_updated_at ON public.colaboradores;
CREATE TRIGGER trg_colaboradores_updated_at
    BEFORE UPDATE ON public.colaboradores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 119: Added updated_at column to ferramentas, consertos, movimentacoes, and colaboradores';
END;
$$;
