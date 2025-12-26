-- ============================================================================
-- MIGRATION 120: AUDIT LOGS TABLE
-- ============================================================================
-- Tabela para registro de ações sensíveis para compliance e segurança.
-- Registra criação/deleção de usuários, alterações de permissão, etc.
-- ============================================================================

-- Criar tabela de audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  severity text NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  actor_id text NOT NULL,
  target_id uuid,
  target_type text,
  org_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity) WHERE severity IN ('WARNING', 'CRITICAL');

-- RLS: Apenas admins podem ver logs da sua organização
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver logs da sua org
CREATE POLICY "Admins can view org audit logs" ON public.audit_logs
  FOR SELECT
  USING (
    org_id IS NULL OR
    EXISTS (
      SELECT 1 FROM operium_profiles op
      WHERE op.user_id = auth.uid()
        AND op.org_id = audit_logs.org_id
        AND op.role = 'ADMIN'
        AND op.active = true
    )
  );

-- Policy: Sistema pode inserir logs (service_role)
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Comentário
COMMENT ON TABLE public.audit_logs IS 'Registro de ações sensíveis para compliance e segurança';
