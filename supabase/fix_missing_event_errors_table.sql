-- ============================================================================
-- FIX: Create missing event_ingestion_errors table
-- Execute this in Supabase SQL Editor if migration 046 wasn't fully applied
-- ============================================================================

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

COMMENT ON TABLE public.event_ingestion_errors IS 
'Log de erros de ingestão de eventos. Erros são registrados aqui sem bloquear operação principal.';

-- RLS
ALTER TABLE public.event_ingestion_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own errors" ON public.event_ingestion_errors;
CREATE POLICY "Users can view own errors" ON public.event_ingestion_errors
    FOR SELECT USING (profile_id = (SELECT auth.uid()));

-- Grant permissions
GRANT SELECT ON public.event_ingestion_errors TO authenticated;
GRANT INSERT ON public.event_ingestion_errors TO authenticated;
