-- Migration: 048_fix_metric_catalog_rls.sql
-- Description: Habilita RLS no metric_catalog
-- Author: AI Assistant
-- Date: 2024-12-19

-- Habilitar RLS no metric_catalog
ALTER TABLE public.metric_catalog ENABLE ROW LEVEL SECURITY;

-- Permitir leitura por todos usuários autenticados (é um catálogo público)
CREATE POLICY "Anyone can read metric catalog" ON public.metric_catalog
    FOR SELECT TO authenticated USING (TRUE);

-- Apenas service role pode modificar o catálogo
CREATE POLICY "Only service role can modify catalog" ON public.metric_catalog
    FOR ALL USING (
        (SELECT current_setting('role', true)) = 'service_role'
    );

COMMENT ON TABLE public.metric_catalog IS 
'Catálogo canônico de métricas do sistema.
RLS: Leitura permitida para todos usuários autenticados.
Modificação apenas via service_role.';
