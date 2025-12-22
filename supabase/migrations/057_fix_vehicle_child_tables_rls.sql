-- Migration: 057_fix_vehicle_child_tables_rls.sql
-- Description: Fixes RLS policies for vehicle_usage_events, vehicle_maintenances, and vehicle_costs.
-- Issue: Original policies used FOR ALL with only USING, blocking INSERT operations.

-- =============================================
-- VEHICLE USAGE EVENTS
-- =============================================
DROP POLICY IF EXISTS "Users can view own vehicle usage" ON public.vehicle_usage_events;

CREATE POLICY "Users can select own vehicle usage"
ON public.vehicle_usage_events
FOR SELECT
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert vehicle usage"
ON public.vehicle_usage_events
FOR INSERT
WITH CHECK (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update own vehicle usage"
ON public.vehicle_usage_events
FOR UPDATE
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own vehicle usage"
ON public.vehicle_usage_events
FOR DELETE
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

-- =============================================
-- VEHICLE MAINTENANCES
-- =============================================
DROP POLICY IF EXISTS "Users can view own vehicle maintenances" ON public.vehicle_maintenances;

CREATE POLICY "Users can select own vehicle maintenances"
ON public.vehicle_maintenances
FOR SELECT
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert vehicle maintenances"
ON public.vehicle_maintenances
FOR INSERT
WITH CHECK (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update own vehicle maintenances"
ON public.vehicle_maintenances
FOR UPDATE
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own vehicle maintenances"
ON public.vehicle_maintenances
FOR DELETE
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

-- =============================================
-- VEHICLE COSTS
-- =============================================
DROP POLICY IF EXISTS "Users can view own vehicle costs" ON public.vehicle_costs;

CREATE POLICY "Users can select own vehicle costs"
ON public.vehicle_costs
FOR SELECT
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert vehicle costs"
ON public.vehicle_costs
FOR INSERT
WITH CHECK (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update own vehicle costs"
ON public.vehicle_costs
FOR UPDATE
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own vehicle costs"
ON public.vehicle_costs
FOR DELETE
USING (
  vehicle_id IN (
    SELECT id FROM public.vehicles WHERE profile_id = auth.uid()
  )
);
