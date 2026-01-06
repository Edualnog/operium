-- Migration: Clean up unused tables
-- Remove observability system (moved to backend) and duplicate/unused tables

-- ============================================================================
-- 1. SISTEMA DE EVENTOS/OBSERVABILIDADE (Movido para backend)
-- ============================================================================

DROP TABLE IF EXISTS public.event_context CASCADE;
DROP TABLE IF EXISTS public.event_ingestion_errors CASCADE;
DROP TABLE IF EXISTS public.event_ingestion_config CASCADE;
DROP TABLE IF EXISTS public.event_policy CASCADE;
DROP TABLE IF EXISTS public.event_type_catalog CASCADE;
DROP TABLE IF EXISTS public.derived_event_types CASCADE;
DROP TABLE IF EXISTS public.derived_metrics CASCADE;
DROP TABLE IF EXISTS public.domain_events CASCADE;

DROP TABLE IF EXISTS public.observer_execution_log CASCADE;
DROP TABLE IF EXISTS public.observer_state CASCADE;

DROP TABLE IF EXISTS public.operational_alerts CASCADE;
DROP TABLE IF EXISTS public.operational_baselines CASCADE;
DROP TABLE IF EXISTS public.operational_context_snapshots CASCADE;

DROP TABLE IF EXISTS public.metric_execution_log CASCADE;
DROP TABLE IF EXISTS public.metric_catalog CASCADE;

-- ============================================================================
-- 2. SISTEMA DE ASSETS (Duplicado com ferramentas)
-- ============================================================================

DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.asset_statuses CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;

-- ============================================================================
-- 3. ANÁLISE COMPORTAMENTAL (Não implementado)
-- ============================================================================

DROP TABLE IF EXISTS public.collaborator_behavior_features CASCADE;
DROP TABLE IF EXISTS public.collaborator_operational_profile CASCADE;
DROP TABLE IF EXISTS public.collaborator_role_history CASCADE;
DROP TABLE IF EXISTS public.vehicle_behavior_features CASCADE;

-- ============================================================================
-- 4. OPERIUM SIMPLIFICADO (Duplicado/não usado)
-- ============================================================================

DROP TABLE IF EXISTS public.operium_events CASCADE;
DROP TABLE IF EXISTS public.operium_inventory_items CASCADE;
DROP TABLE IF EXISTS public.operium_vehicles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- ============================================================================
-- 5. AUDIT LOGS (Substituído por telemetria no backend)
-- ============================================================================

DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Removed 26 unused tables:
-- - 15 tables from observability/events system
-- - 3 tables from duplicate assets system  
-- - 4 tables from behavioral analysis
-- - 4 tables from simplified operium system
-- 
-- Core tables preserved:
-- - profiles, operium_profiles (auth)
-- - colaboradores, badges (gamification)
-- - ferramentas, movimentacoes, consertos (core)
-- - teams, team_equipment, team_members (teams)
-- - vehicles, vehicle_costs (vehicles)
-- - inventarios (inventory)
-- - field_reports (reports)
-- ============================================================================
