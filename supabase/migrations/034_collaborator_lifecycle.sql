-- Migration: 034_collaborator_lifecycle.sql
-- Description: Add collaborator lifecycle features: dismissal, promotion history, auto seniority update
-- Author: Antigravity
-- Date: 2024-12-18

-- ============================================================================
-- 1. ADD STATUS FIELDS TO COLABORADORES
-- ============================================================================

ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ATIVO' 
CHECK (status IN ('ATIVO', 'DEMITIDO'));

ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS demitido_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.colaboradores 
ADD COLUMN IF NOT EXISTS demitido_motivo TEXT;

COMMENT ON COLUMN public.colaboradores.status IS 'Status do colaborador: ATIVO ou DEMITIDO';
COMMENT ON COLUMN public.colaboradores.demitido_at IS 'Data/hora da demissão';
COMMENT ON COLUMN public.colaboradores.demitido_motivo IS 'Motivo da demissão para registro histórico';

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON public.colaboradores(status);


-- ============================================================================
-- 2. CREATE ROLE HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.collaborator_role_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    role_function TEXT NOT NULL,
    promoted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    promoted_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.collaborator_role_history IS 'Histórico de cargos/promoções do colaborador. Append-only para análise histórica.';
COMMENT ON COLUMN public.collaborator_role_history.role_function IS 'Cargo/função nesta posição';
COMMENT ON COLUMN public.collaborator_role_history.promoted_at IS 'Data da promoção para este cargo';
COMMENT ON COLUMN public.collaborator_role_history.promoted_by IS 'Usuário que registrou a promoção';
COMMENT ON COLUMN public.collaborator_role_history.notes IS 'Observações sobre a promoção';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crh_collaborator_id ON public.collaborator_role_history(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_crh_promoted_at ON public.collaborator_role_history(promoted_at);


-- ============================================================================
-- 3. RLS FOR ROLE HISTORY
-- ============================================================================

ALTER TABLE public.collaborator_role_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own collaborator role history" ON public.collaborator_role_history;
CREATE POLICY "Users can view own collaborator role history"
    ON public.collaborator_role_history FOR SELECT
    USING (
        collaborator_id IN (
            SELECT id FROM public.colaboradores WHERE profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own collaborator role history" ON public.collaborator_role_history;
CREATE POLICY "Users can insert own collaborator role history"
    ON public.collaborator_role_history FOR INSERT
    WITH CHECK (
        collaborator_id IN (
            SELECT id FROM public.colaboradores WHERE profile_id = auth.uid()
        )
    );

-- No UPDATE/DELETE - append-only for audit trail
GRANT SELECT, INSERT ON public.collaborator_role_history TO authenticated;


-- ============================================================================
-- 4. FUNCTION: AUTO UPDATE SENIORITY BUCKET
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_update_seniority_buckets()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update seniority_bucket based on data_admissao
    UPDATE public.collaborator_operational_profile cop
    SET 
        seniority_bucket = CASE
            WHEN c.data_admissao IS NULL THEN cop.seniority_bucket -- Keep current if no date
            WHEN c.data_admissao > NOW() - INTERVAL '6 months' THEN 'LESS_THAN_6_MONTHS'
            WHEN c.data_admissao > NOW() - INTERVAL '24 months' THEN '6_TO_24_MONTHS'
            ELSE 'MORE_THAN_24_MONTHS'
        END,
        updated_at = NOW()
    FROM public.colaboradores c
    WHERE cop.collaborator_id = c.id
      AND c.status = 'ATIVO'
      AND c.data_admissao IS NOT NULL
      AND cop.seniority_bucket != CASE
            WHEN c.data_admissao > NOW() - INTERVAL '6 months' THEN 'LESS_THAN_6_MONTHS'
            WHEN c.data_admissao > NOW() - INTERVAL '24 months' THEN '6_TO_24_MONTHS'
            ELSE 'MORE_THAN_24_MONTHS'
        END;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.auto_update_seniority_buckets IS 'Atualiza automaticamente o seniority_bucket baseado na data_admissao. Executar via cron job diário.';


-- ============================================================================
-- 5. SCHEDULE CRON JOB FOR SENIORITY UPDATE
-- ============================================================================
-- Note: Run this after migration to schedule the job

-- Schedule to run daily at 3:05 AM (after score calculation at 3:00)
SELECT cron.schedule(
    'auto_update_seniority',
    '5 3 * * *',
    'SELECT public.auto_update_seniority_buckets()'
);


-- ============================================================================
-- 6. CREATE INITIAL ROLE HISTORY ENTRIES
-- ============================================================================
-- For existing collaborators with role_function, create initial history entry

INSERT INTO public.collaborator_role_history (collaborator_id, role_function, promoted_at, notes)
SELECT 
    cop.collaborator_id,
    cop.role_function,
    COALESCE(c.data_admissao, cop.created_at),
    'Cargo inicial (migração automática)'
FROM public.collaborator_operational_profile cop
JOIN public.colaboradores c ON c.id = cop.collaborator_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.collaborator_role_history crh 
    WHERE crh.collaborator_id = cop.collaborator_id
);
