-- Migration: 043_fix_view_security.sql
-- Description: Corrige views para usar SECURITY INVOKER (respeita RLS)
-- Author: AI Assistant
-- Date: 2024-12-19

-- Alterar views para SECURITY INVOKER
ALTER VIEW public.v_events_vehicle_maintenance SET (security_invoker = on);
ALTER VIEW public.v_events_vehicle_costs SET (security_invoker = on);
ALTER VIEW public.v_events_vehicle_usage SET (security_invoker = on);
ALTER VIEW public.v_all_vehicle_events SET (security_invoker = on);

COMMENT ON VIEW public.v_events_vehicle_maintenance IS 
'View de projeção: Transforma manutenções de veículos em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.
Usa SECURITY INVOKER para respeitar RLS.';

COMMENT ON VIEW public.v_events_vehicle_costs IS 
'View de projeção: Transforma custos de veículos em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.
Usa SECURITY INVOKER para respeitar RLS.';

COMMENT ON VIEW public.v_events_vehicle_usage IS 
'View de projeção: Transforma uso de veículos em eventos normalizados.
NÃO ALTERA dados originais. Apenas projeta para formato de evento.
Usa SECURITY INVOKER para respeitar RLS.';

COMMENT ON VIEW public.v_all_vehicle_events IS 
'View unificada de todos os eventos de veículos projetados.
Usa SECURITY INVOKER para respeitar RLS.';
