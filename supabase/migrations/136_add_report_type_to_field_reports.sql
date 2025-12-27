-- ============================================================================
-- Migration 136: Add report_type to field_reports
-- Permite relatórios individuais e de equipe separadamente
-- ============================================================================

-- 1. Adicionar coluna report_type com valor padrão 'TEAM' (comportamento anterior)
ALTER TABLE public.field_reports
ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'TEAM'
CHECK (report_type IN ('INDIVIDUAL', 'TEAM'));

-- 2. Backfill: marcar todos os relatórios existentes como TEAM
UPDATE public.field_reports
SET report_type = 'TEAM'
WHERE report_type IS NULL;

-- 3. Tornar coluna NOT NULL após backfill
ALTER TABLE public.field_reports
ALTER COLUMN report_type SET NOT NULL;

-- 4. Remover UNIQUE constraint antiga (user_id, report_date)
-- Isso permite que o mesmo usuário faça 2 relatórios no mesmo dia (individual + equipe)
ALTER TABLE public.field_reports
DROP CONSTRAINT IF EXISTS field_reports_user_id_report_date_key;

-- 5. Criar nova UNIQUE constraint que inclui report_type
-- Garante apenas 1 relatório de cada tipo por usuário/dia
ALTER TABLE public.field_reports
ADD CONSTRAINT field_reports_user_date_type_key
UNIQUE (user_id, report_date, report_type);

-- 6. Criar índice para performance em filtros por tipo
CREATE INDEX IF NOT EXISTS idx_field_reports_type
ON public.field_reports(report_type);

-- 7. Comentário explicativo
COMMENT ON COLUMN public.field_reports.report_type IS
'Tipo de relatório: INDIVIDUAL (pessoal do colaborador) ou TEAM (da equipe). Um colaborador pode fazer ambos no mesmo dia.';
