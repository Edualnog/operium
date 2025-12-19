-- Migration: 036_create_vehicles_module.sql
-- Description: Cria módulo de Gestão de Veículos e infraestrutura de dados observáveis.
-- Author: Antigravity Agent
-- Fix: Adjusted to use profile_id (User as Tenant) instead of non-existent organizations table.

-- 1. Tabela de Veículos
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed from org_id to profile_id
  plate text NOT NULL,
  vehicle_type text NOT NULL CHECK (
    vehicle_type IN ('CAR','TRUCK','VAN','MOTORCYCLE','OTHER')
  ),
  fuel_type text NOT NULL CHECK (
    fuel_type IN ('GASOLINE','DIESEL','FLEX','ELECTRIC','HYBRID')
  ),
  brand text,
  model text,
  year integer,
  acquisition_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id, plate)
);

-- 2. Manutenções
CREATE TABLE public.vehicle_maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL,
  description text,
  cost numeric NOT NULL DEFAULT 0,
  maintenance_date date NOT NULL,
  next_maintenance_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Custos (Fuel, Insurance, etc)
CREATE TABLE public.vehicle_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  cost_type text NOT NULL,
  amount numeric NOT NULL,
  reference_month date NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Eventos de Uso (Associação com Colaborador)
CREATE TABLE public.vehicle_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  collaborator_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  usage_type text NOT NULL, -- 'assignment', 'return', 'trip'
  usage_date timestamp with time zone DEFAULT now(),
  notes text
);

-- 5. Features Comportamentais (Blackbox)
CREATE TABLE public.vehicle_behavior_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  monthly_avg_cost numeric DEFAULT 0,
  maintenance_frequency numeric DEFAULT 0,
  downtime_rate numeric DEFAULT 0,
  human_risk_index numeric DEFAULT 0,
  calculated_at timestamp with time zone DEFAULT now(),
  UNIQUE (vehicle_id)
);

-- 6. View Agregada (Analytics)
CREATE OR REPLACE VIEW analytics.vehicle_operational_aggregates AS
SELECT
  p.industry_segment,
  p.company_size,
  v.vehicle_type,
  avg(vbf.monthly_avg_cost) AS avg_monthly_cost,
  avg(vbf.maintenance_frequency) AS avg_maintenance_freq,
  avg(vbf.human_risk_index) AS avg_human_risk
FROM public.vehicle_behavior_features vbf
JOIN public.vehicles v ON v.id = vbf.vehicle_id
JOIN public.profiles p ON p.id = v.profile_id
-- Removed join to organizations table as it does not exist. Profiles holds company data.
GROUP BY 1,2,3;

-- 7. RLS & Policies

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_behavior_features ENABLE ROW LEVEL SECURITY;

-- Vehicles Policy
CREATE POLICY "Users can view own vehicles"
ON public.vehicles
FOR ALL
USING (profile_id = auth.uid());

-- Maintenance Policy (Child)
CREATE POLICY "Users can view own vehicle maintenances"
ON public.vehicle_maintenances
FOR ALL
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE profile_id = auth.uid()
  )
);

-- Costs Policy (Child)
CREATE POLICY "Users can view own vehicle costs"
ON public.vehicle_costs
FOR ALL
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE profile_id = auth.uid()
  )
);

-- Usage Events Policy (Child)
CREATE POLICY "Users can view own vehicle usage"
ON public.vehicle_usage_events
FOR ALL
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE profile_id = auth.uid()
  )
);

-- Behavior Features Policy (Child)
CREATE POLICY "Users can view own vehicle features"
ON public.vehicle_behavior_features
FOR SELECT
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles
    WHERE profile_id = auth.uid()
  )
);
