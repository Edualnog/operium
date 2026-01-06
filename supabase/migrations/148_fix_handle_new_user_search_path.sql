-- ============================================================================
-- Migration 148: Fix handle_new_user search_path Security Warning
-- Description: Add SET search_path to handle_new_user function for security
-- Author: AI Assistant
-- Date: 2026-01-06
-- 
-- Fix: Function search_path mutable warning
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, trial_start_date)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NOW() -- Iniciar trial automaticamente na criação do perfil
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
'Cria perfil automaticamente para novos usuários e inicia o período de trial de 7 dias. 
Security: search_path set to public for security.';
