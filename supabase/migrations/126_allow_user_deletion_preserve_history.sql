-- Migration: Permitir deleção de usuários mantendo dados históricos
-- Descrição: Altera foreign keys para SET NULL, permitindo deletar auth.users
-- sem perder dados históricos de movimentações, ferramentas, etc.

-- 1. Primeiro, deletar a FK de profiles que bloqueia a deleção
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Recriar com ON DELETE CASCADE (deleta profile quando deleta auth.users)
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Agora alterar as FKs que referenciam profiles para SET NULL
-- Assim os dados históricos ficam preservados mas "órfãos"

-- colaboradores
ALTER TABLE public.colaboradores
DROP CONSTRAINT IF EXISTS colaboradores_profile_id_fkey;

ALTER TABLE public.colaboradores
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.colaboradores
ADD CONSTRAINT colaboradores_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ferramentas
ALTER TABLE public.ferramentas
DROP CONSTRAINT IF EXISTS ferramentas_profile_id_fkey;

ALTER TABLE public.ferramentas
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.ferramentas
ADD CONSTRAINT ferramentas_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- movimentacoes
ALTER TABLE public.movimentacoes
DROP CONSTRAINT IF EXISTS movimentacoes_profile_id_fkey;

ALTER TABLE public.movimentacoes
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.movimentacoes
ADD CONSTRAINT movimentacoes_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- teams
ALTER TABLE public.teams
DROP CONSTRAINT IF EXISTS teams_profile_id_fkey;

ALTER TABLE public.teams
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.teams
ADD CONSTRAINT teams_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- consertos
ALTER TABLE public.consertos
DROP CONSTRAINT IF EXISTS consertos_profile_id_fkey;

ALTER TABLE public.consertos
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.consertos
ADD CONSTRAINT consertos_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- vehicles
ALTER TABLE public.vehicles
DROP CONSTRAINT IF EXISTS vehicles_profile_id_fkey;

ALTER TABLE public.vehicles
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.vehicles
ADD CONSTRAINT vehicles_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- inventarios
ALTER TABLE public.inventarios
DROP CONSTRAINT IF EXISTS inventarios_profile_id_fkey;

ALTER TABLE public.inventarios
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.inventarios
ADD CONSTRAINT inventarios_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- domain_events
ALTER TABLE public.domain_events
DROP CONSTRAINT IF EXISTS domain_events_profile_id_fkey;

ALTER TABLE public.domain_events
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.domain_events
ADD CONSTRAINT domain_events_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- derived_metrics
ALTER TABLE public.derived_metrics
DROP CONSTRAINT IF EXISTS derived_metrics_profile_id_fkey;

ALTER TABLE public.derived_metrics
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.derived_metrics
ADD CONSTRAINT derived_metrics_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- termos_responsabilidade
ALTER TABLE public.termos_responsabilidade
DROP CONSTRAINT IF EXISTS termos_responsabilidade_profile_id_fkey;

ALTER TABLE public.termos_responsabilidade
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.termos_responsabilidade
ADD CONSTRAINT termos_responsabilidade_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- legal_agreements
ALTER TABLE public.legal_agreements
DROP CONSTRAINT IF EXISTS legal_agreements_profile_id_fkey;

ALTER TABLE public.legal_agreements
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.legal_agreements
ADD CONSTRAINT legal_agreements_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- event_ingestion_config
ALTER TABLE public.event_ingestion_config
DROP CONSTRAINT IF EXISTS event_ingestion_config_profile_id_fkey;

ALTER TABLE public.event_ingestion_config
ADD CONSTRAINT event_ingestion_config_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- event_ingestion_errors
ALTER TABLE public.event_ingestion_errors
DROP CONSTRAINT IF EXISTS event_ingestion_errors_profile_id_fkey;

ALTER TABLE public.event_ingestion_errors
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.event_ingestion_errors
ADD CONSTRAINT event_ingestion_errors_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- observer_state
ALTER TABLE public.observer_state
DROP CONSTRAINT IF EXISTS observer_state_profile_id_fkey;

ALTER TABLE public.observer_state
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.observer_state
ADD CONSTRAINT observer_state_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- observer_execution_log
ALTER TABLE public.observer_execution_log
DROP CONSTRAINT IF EXISTS observer_execution_log_profile_id_fkey;

ALTER TABLE public.observer_execution_log
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.observer_execution_log
ADD CONSTRAINT observer_execution_log_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- operational_baselines
ALTER TABLE public.operational_baselines
DROP CONSTRAINT IF EXISTS operational_baselines_profile_id_fkey;

ALTER TABLE public.operational_baselines
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.operational_baselines
ADD CONSTRAINT operational_baselines_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- operational_alerts
ALTER TABLE public.operational_alerts
DROP CONSTRAINT IF EXISTS operational_alerts_profile_id_fkey;

ALTER TABLE public.operational_alerts
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.operational_alerts
ADD CONSTRAINT operational_alerts_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- metric_execution_log
ALTER TABLE public.metric_execution_log
DROP CONSTRAINT IF EXISTS metric_execution_log_profile_id_fkey;

ALTER TABLE public.metric_execution_log
ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE public.metric_execution_log
ADD CONSTRAINT metric_execution_log_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- operium_profiles (este deve ser CASCADE, não SET NULL)
ALTER TABLE public.operium_profiles
DROP CONSTRAINT IF EXISTS operium_profiles_user_id_fkey;

ALTER TABLE public.operium_profiles
ADD CONSTRAINT operium_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT profiles_id_fkey ON public.profiles IS 
'CASCADE: Quando usuário é deletado em auth.users, o profile é deletado também';

COMMENT ON CONSTRAINT colaboradores_profile_id_fkey ON public.colaboradores IS 
'SET NULL: Dados históricos são preservados como órfãos quando o dono é deletado';
