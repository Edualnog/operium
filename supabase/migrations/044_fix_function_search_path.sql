-- Migration: 044_fix_function_search_path.sql
-- Description: Corrige search_path das funções para segurança
-- Author: AI Assistant
-- Date: 2024-12-19

-- Corrigir search_path de funções existentes
-- Isso previne ataques de search_path injection

ALTER FUNCTION public.trigger_calculate_vehicle_features() SET search_path = public;
ALTER FUNCTION analytics.calculate_collaborator_scores() SET search_path = analytics, public;
ALTER FUNCTION public.trigger_vehicle_status_change() SET search_path = public;
ALTER FUNCTION public.auto_update_seniority_buckets() SET search_path = public;
ALTER FUNCTION public.calculate_vehicle_features() SET search_path = public;
ALTER FUNCTION public.trigger_update_odometer() SET search_path = public;
ALTER FUNCTION public.protect_behavior_features() SET search_path = public;

-- Nota: O aviso "Leaked Password Protection Disabled" precisa ser corrigido
-- nas configurações de Auth do Supabase Dashboard:
-- Authentication > Providers > Email > Enable "Leaked password protection"
