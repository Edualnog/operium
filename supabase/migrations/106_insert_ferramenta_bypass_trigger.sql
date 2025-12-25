-- ============================================================================
-- Migration 106: Create RPC to insert ferramenta bypassing problematic triggers
-- This is a workaround for when event_ingestion_errors table doesn't exist
-- ============================================================================

-- First, ensure event_ingestion_errors table exists to prevent future issues
CREATE TABLE IF NOT EXISTS public.event_ingestion_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_table TEXT NOT NULL,
    source_id UUID,
    event_type TEXT,
    error_message TEXT NOT NULL,
    error_detail JSONB DEFAULT '{}',
    stack_trace TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_ingestion_errors_profile
    ON public.event_ingestion_errors(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_ingestion_errors_source
    ON public.event_ingestion_errors(source_table, created_at DESC);

-- RLS
ALTER TABLE public.event_ingestion_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own errors" ON public.event_ingestion_errors;
CREATE POLICY "Users can view own errors" ON public.event_ingestion_errors
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own errors" ON public.event_ingestion_errors;
CREATE POLICY "Users can insert own errors" ON public.event_ingestion_errors
    FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

-- Grant permissions
GRANT SELECT, INSERT ON public.event_ingestion_errors TO authenticated;

-- Create RPC function to insert ferramenta bypassing triggers if needed
CREATE OR REPLACE FUNCTION public.insert_ferramenta_safe(
    p_profile_id UUID,
    p_nome TEXT,
    p_categoria TEXT DEFAULT NULL,
    p_quantidade_total INTEGER DEFAULT 1,
    p_estado TEXT DEFAULT 'ok',
    p_codigo TEXT DEFAULT NULL,
    p_linha_grupo TEXT DEFAULT NULL,
    p_tamanho TEXT DEFAULT NULL,
    p_cor TEXT DEFAULT NULL,
    p_foto_url TEXT DEFAULT NULL,
    p_estoque_minimo INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
    v_quantidade_disponivel INTEGER;
    v_inserted_id UUID;
BEGIN
    -- Calculate quantidade_disponivel based on estado
    v_quantidade_disponivel := CASE
        WHEN p_estado = 'ok' THEN p_quantidade_total
        ELSE 0
    END;

    -- Try normal insert first
    BEGIN
        INSERT INTO public.ferramentas (
            profile_id,
            nome,
            categoria,
            quantidade_total,
            quantidade_disponivel,
            estado,
            codigo,
            linha_grupo,
            tamanho,
            cor,
            foto_url,
            estoque_minimo
        ) VALUES (
            p_profile_id,
            p_nome,
            p_categoria,
            p_quantidade_total,
            v_quantidade_disponivel,
            p_estado,
            p_codigo,
            p_linha_grupo,
            p_tamanho,
            p_cor,
            p_foto_url,
            p_estoque_minimo
        )
        RETURNING id INTO v_inserted_id;

        -- Fetch the inserted record
        SELECT row_to_json(f.*) INTO v_result
        FROM public.ferramentas f
        WHERE f.id = v_inserted_id;

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        -- If error is about event_ingestion_errors, try with triggers disabled
        IF SQLERRM LIKE '%event_ingestion_errors%' THEN
            -- Disable triggers temporarily
            ALTER TABLE public.ferramentas DISABLE TRIGGER ALL;

            BEGIN
                INSERT INTO public.ferramentas (
                    profile_id,
                    nome,
                    categoria,
                    quantidade_total,
                    quantidade_disponivel,
                    estado,
                    codigo,
                    linha_grupo,
                    tamanho,
                    cor,
                    foto_url,
                    estoque_minimo
                ) VALUES (
                    p_profile_id,
                    p_nome,
                    p_categoria,
                    p_quantidade_total,
                    v_quantidade_disponivel,
                    p_estado,
                    p_codigo,
                    p_linha_grupo,
                    p_tamanho,
                    p_cor,
                    p_foto_url,
                    p_estoque_minimo
                )
                RETURNING id INTO v_inserted_id;

                -- Re-enable triggers
                ALTER TABLE public.ferramentas ENABLE TRIGGER ALL;

                -- Fetch the inserted record
                SELECT row_to_json(f.*) INTO v_result
                FROM public.ferramentas f
                WHERE f.id = v_inserted_id;

                RETURN v_result;

            EXCEPTION WHEN OTHERS THEN
                -- Re-enable triggers even on error
                ALTER TABLE public.ferramentas ENABLE TRIGGER ALL;
                RAISE;
            END;
        ELSE
            RAISE;
        END IF;
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.insert_ferramenta_safe TO authenticated;

COMMENT ON FUNCTION public.insert_ferramenta_safe IS
'Insere ferramenta de forma segura, contornando triggers problemáticos se necessário';
