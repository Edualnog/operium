-- Migration: 044_fix_function_search_path.sql
-- Description: Corrige search_path das funções para segurança
-- Author: AI Assistant
-- Date: 2024-12-19

-- Corrigir search_path de funções existentes
-- Usando DO block para evitar erros se função não existir

DO $$
BEGIN
    -- trigger_calculate_vehicle_features
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_calculate_vehicle_features') THEN
        ALTER FUNCTION public.trigger_calculate_vehicle_features() SET search_path = public;
    END IF;
    
    -- trigger_vehicle_status_change
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_vehicle_status_change') THEN
        ALTER FUNCTION public.trigger_vehicle_status_change() SET search_path = public;
    END IF;
    
    -- auto_update_seniority_buckets
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_update_seniority_buckets') THEN
        ALTER FUNCTION public.auto_update_seniority_buckets() SET search_path = public;
    END IF;
    
    -- trigger_update_odometer
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trigger_update_odometer') THEN
        ALTER FUNCTION public.trigger_update_odometer() SET search_path = public;
    END IF;
    
    -- protect_behavior_features
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'protect_behavior_features') THEN
        ALTER FUNCTION public.protect_behavior_features() SET search_path = public;
    END IF;
END $$;

-- Para funções no schema analytics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
               WHERE p.proname = 'calculate_collaborator_scores' AND n.nspname = 'analytics') THEN
        ALTER FUNCTION analytics.calculate_collaborator_scores() SET search_path = analytics, public;
    END IF;
END $$;

-- Nota: O aviso "Leaked Password Protection Disabled" precisa ser corrigido
-- nas configurações de Auth do Supabase Dashboard:
-- Authentication > Providers > Email > Enable "Leaked password protection"
