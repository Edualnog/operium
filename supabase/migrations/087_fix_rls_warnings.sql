-- Migration: 087_fix_rls_warnings.sql
-- Description: Enable RLS on tables that have policies but RLS not enabled
-- Author: AI Assistant
-- Date: 2024-12-23
-- 
-- Fixes Supabase linter warnings about RLS disabled on public tables
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON TABLES WITH POLICIES
-- ============================================================================

-- ferramentas table
ALTER TABLE public.ferramentas ENABLE ROW LEVEL SECURITY;

-- teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- team_equipment table
ALTER TABLE public.team_equipment ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. FIX SECURITY DEFINER VIEW
-- ============================================================================

-- Drop and recreate view_inventory_official with SECURITY INVOKER
DROP VIEW IF EXISTS public.view_inventory_official;

CREATE OR REPLACE VIEW public.view_inventory_official AS
SELECT 
    f.id,
    f.nome,
    f.categoria,
    f.quantidade_total,
    f.quantidade_disponivel,
    f.estado,
    f.profile_id,
    f.created_at
FROM public.ferramentas f
WHERE f.profile_id = (SELECT auth.uid());

-- Set security invoker (default for new views, but explicit is better)
ALTER VIEW public.view_inventory_official SET (security_invoker = on);

-- Grant access
GRANT SELECT ON public.view_inventory_official TO authenticated;

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.ferramentas IS 
'Inventory items with RLS enabled for multi-tenant isolation.';

COMMENT ON TABLE public.teams IS 
'Teams with RLS enabled for multi-tenant isolation.';

COMMENT ON TABLE public.team_equipment IS 
'Team equipment assignments with RLS enabled for multi-tenant isolation.';

COMMENT ON VIEW public.view_inventory_official IS 
'Official inventory view with SECURITY INVOKER (respects caller RLS policies).';

