-- ============================================================================
-- FIX: Database Performance Optimizations
-- ============================================================================
-- 1. Add indexes for unindexed foreign keys
-- 2. Remove unused indexes to save space and improve writes
-- ============================================================================

-- ============================================================================
-- PART 1: Add indexes for unindexed foreign keys
-- ============================================================================

-- gamification.score_history
CREATE INDEX IF NOT EXISTS idx_score_history_colaborador 
ON gamification.score_history(colaborador_id);

-- hvac.catalog_items
CREATE INDEX IF NOT EXISTS idx_catalog_items_category 
ON hvac.catalog_items(category_id);

-- hvac.categories
CREATE INDEX IF NOT EXISTS idx_categories_parent 
ON hvac.categories(parent_id);

-- public.assets
CREATE INDEX IF NOT EXISTS idx_assets_catalog_item 
ON public.assets(catalog_item_id);

-- public.collaborator_role_history
CREATE INDEX IF NOT EXISTS idx_crh_promoted_by 
ON public.collaborator_role_history(promoted_by);

-- public.ferramentas
CREATE INDEX IF NOT EXISTS idx_ferramentas_catalog_item 
ON public.ferramentas(catalog_item_id);

-- public.operational_alerts
CREATE INDEX IF NOT EXISTS idx_operational_alerts_acknowledged_by 
ON public.operational_alerts(acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_operational_alerts_resolved_by 
ON public.operational_alerts(resolved_by);

-- public.team_equipment
CREATE INDEX IF NOT EXISTS idx_team_equipment_mov_devolucao 
ON public.team_equipment(movimentacao_devolucao_id);

CREATE INDEX IF NOT EXISTS idx_team_equipment_mov_saida 
ON public.team_equipment(movimentacao_saida_id);

-- public.vehicle_costs
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_vehicle 
ON public.vehicle_costs(vehicle_id);

-- public.vehicle_maintenances
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenances_vehicle 
ON public.vehicle_maintenances(vehicle_id);

-- public.vehicle_usage_events
CREATE INDEX IF NOT EXISTS idx_vehicle_usage_collaborator 
ON public.vehicle_usage_events(collaborator_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_usage_vehicle 
ON public.vehicle_usage_events(vehicle_id);

-- ============================================================================
-- PART 2: Remove unused indexes (save space, improve INSERT performance)
-- ============================================================================

-- ferramentas
DROP INDEX IF EXISTS idx_ferramentas_estado;

-- movimentacoes
DROP INDEX IF EXISTS idx_movimentacoes_tipo;
DROP INDEX IF EXISTS idx_movimentacoes_prazo_devolucao;
DROP INDEX IF EXISTS idx_movimentacoes_saida_at;
DROP INDEX IF EXISTS idx_movimentacoes_devolucao_at;

-- termos_responsabilidade
DROP INDEX IF EXISTS idx_termos_data_assinatura;

-- colaboradores
DROP INDEX IF EXISTS idx_colaboradores_email;

-- profiles
DROP INDEX IF EXISTS idx_profiles_stripe_customer_id;
DROP INDEX IF EXISTS idx_profiles_subscription_status;
DROP INDEX IF EXISTS idx_profiles_trial_start_date;

-- legal_agreements
DROP INDEX IF EXISTS idx_legal_agreements_profile_id;

-- event_ingestion_errors
DROP INDEX IF EXISTS idx_event_ingestion_errors_source;

-- collaborator_operational_profile
DROP INDEX IF EXISTS idx_cop_role_function;
DROP INDEX IF EXISTS idx_cop_seniority;

-- collaborator_behavior_features
DROP INDEX IF EXISTS idx_cbf_collaborator_id;
DROP INDEX IF EXISTS idx_cbf_calculated_at;

-- domain_events
DROP INDEX IF EXISTS idx_domain_events_profile_id;
DROP INDEX IF EXISTS idx_domain_events_entity;
DROP INDEX IF EXISTS idx_domain_events_type;
DROP INDEX IF EXISTS idx_domain_events_payload;
DROP INDEX IF EXISTS idx_domain_events_entity_occurred;
DROP INDEX IF EXISTS idx_domain_events_event_type;

-- collaborator_role_history
DROP INDEX IF EXISTS idx_crh_promoted_at;

-- event_context
DROP INDEX IF EXISTS idx_event_context_event_id;
DROP INDEX IF EXISTS idx_event_context_shift;
DROP INDEX IF EXISTS idx_event_context_urgency;

-- derived_metrics
DROP INDEX IF EXISTS idx_derived_metrics_entity;
DROP INDEX IF EXISTS idx_derived_metrics_current;
DROP INDEX IF EXISTS idx_derived_metrics_calculated;

-- operational_baselines
DROP INDEX IF EXISTS idx_operational_baselines_entity;
DROP INDEX IF EXISTS idx_operational_baselines_active;

-- vehicles
DROP INDEX IF EXISTS idx_vehicles_current_driver;
DROP INDEX IF EXISTS idx_vehicles_profile;

-- operational_alerts
DROP INDEX IF EXISTS idx_operational_alerts_metric;
DROP INDEX IF EXISTS idx_operational_alerts_severity;

-- teams
DROP INDEX IF EXISTS idx_teams_profile;
DROP INDEX IF EXISTS idx_teams_leader;
DROP INDEX IF EXISTS idx_teams_vehicle;

-- team_members
DROP INDEX IF EXISTS idx_team_members_colaborador;

-- team_equipment
DROP INDEX IF EXISTS idx_team_equipment_team;
DROP INDEX IF EXISTS idx_team_equipment_ferramenta;

-- team_assignments
DROP INDEX IF EXISTS idx_team_assignments_team;
DROP INDEX IF EXISTS idx_team_assignments_active;

-- assets
DROP INDEX IF EXISTS idx_assets_org;

-- operium_profiles
DROP INDEX IF EXISTS idx_operium_profiles_role;
DROP INDEX IF EXISTS idx_operium_profiles_team;
DROP INDEX IF EXISTS idx_operium_profiles_name;

-- operium_vehicles
DROP INDEX IF EXISTS idx_operium_vehicles_org_id;

-- operium_events
DROP INDEX IF EXISTS idx_operium_events_type;
DROP INDEX IF EXISTS idx_operium_events_created_at;
DROP INDEX IF EXISTS idx_operium_events_actor_null;

-- field_reports
DROP INDEX IF EXISTS idx_field_reports_org_date;

-- vehicle_costs
DROP INDEX IF EXISTS idx_vehicle_costs_team;
DROP INDEX IF EXISTS idx_vehicle_costs_collaborator;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON INDEX idx_vehicle_costs_vehicle IS 'Index for foreign key vehicle_id';
COMMENT ON INDEX idx_vehicle_maintenances_vehicle IS 'Index for foreign key vehicle_id';
