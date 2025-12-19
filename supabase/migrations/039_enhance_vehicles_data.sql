-- Migration: 039_enhance_vehicles_data.sql
-- Description: Add status, odometer tracking, and automatic feature calculation
-- Author: Antigravity
-- Date: 2024-12-19

-- ============================================
-- 1. Add status column to vehicles
-- ============================================
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
CHECK (status IN ('active', 'maintenance', 'out_of_service'));

COMMENT ON COLUMN public.vehicles.status IS 'Current operational status of the vehicle';

-- ============================================
-- 2. Add odometer tracking to vehicles
-- ============================================
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS current_odometer NUMERIC DEFAULT 0;

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS last_odometer_update TIMESTAMP WITH TIME ZONE DEFAULT now();

COMMENT ON COLUMN public.vehicles.current_odometer IS 'Current odometer reading in km';
COMMENT ON COLUMN public.vehicles.last_odometer_update IS 'When the odometer was last updated';

-- ============================================
-- 3. Add trip tracking fields to usage events
-- ============================================
ALTER TABLE public.vehicle_usage_events
ADD COLUMN IF NOT EXISTS start_odometer NUMERIC;

ALTER TABLE public.vehicle_usage_events
ADD COLUMN IF NOT EXISTS end_odometer NUMERIC;

ALTER TABLE public.vehicle_usage_events
ADD COLUMN IF NOT EXISTS purpose TEXT;

COMMENT ON COLUMN public.vehicle_usage_events.start_odometer IS 'Odometer reading at trip start';
COMMENT ON COLUMN public.vehicle_usage_events.end_odometer IS 'Odometer reading at trip end';
COMMENT ON COLUMN public.vehicle_usage_events.purpose IS 'Purpose or destination of the trip';

-- ============================================
-- 4. Function to calculate vehicle features
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_vehicle_features(p_vehicle_id UUID)
RETURNS VOID AS $$
DECLARE
    v_acquisition_date DATE;
    v_months_active NUMERIC;
    v_total_costs NUMERIC;
    v_maintenance_count INTEGER;
    v_monthly_avg_cost NUMERIC;
    v_maintenance_freq NUMERIC;
    v_downtime_rate NUMERIC;
BEGIN
    -- Get vehicle acquisition date
    SELECT acquisition_date INTO v_acquisition_date
    FROM public.vehicles WHERE id = p_vehicle_id;

    -- Calculate months since acquisition (minimum 1 to avoid division by zero)
    v_months_active := GREATEST(
        EXTRACT(YEAR FROM age(now(), v_acquisition_date)) * 12 +
        EXTRACT(MONTH FROM age(now(), v_acquisition_date)),
        1
    );

    -- Calculate total costs (maintenance + other costs)
    SELECT COALESCE(SUM(cost), 0) INTO v_total_costs
    FROM public.vehicle_maintenances
    WHERE vehicle_id = p_vehicle_id;

    SELECT v_total_costs + COALESCE(SUM(amount), 0) INTO v_total_costs
    FROM public.vehicle_costs
    WHERE vehicle_id = p_vehicle_id;

    -- Calculate monthly average cost
    v_monthly_avg_cost := v_total_costs / v_months_active;

    -- Calculate maintenance frequency (maintenances per month)
    SELECT COUNT(*) INTO v_maintenance_count
    FROM public.vehicle_maintenances
    WHERE vehicle_id = p_vehicle_id;

    v_maintenance_freq := v_maintenance_count::NUMERIC / v_months_active;

    -- Downtime rate is a placeholder (would need status change history)
    -- For now, set to 0 if active, 1 if in maintenance
    SELECT CASE
        WHEN status = 'maintenance' THEN 0.5
        WHEN status = 'out_of_service' THEN 1.0
        ELSE 0.0
    END INTO v_downtime_rate
    FROM public.vehicles WHERE id = p_vehicle_id;

    -- Upsert into behavior features
    INSERT INTO public.vehicle_behavior_features (
        vehicle_id,
        monthly_avg_cost,
        maintenance_frequency,
        downtime_rate,
        human_risk_index,
        calculated_at
    ) VALUES (
        p_vehicle_id,
        v_monthly_avg_cost,
        v_maintenance_freq,
        v_downtime_rate,
        0, -- human_risk_index requires usage data analysis
        now()
    )
    ON CONFLICT (vehicle_id) DO UPDATE SET
        monthly_avg_cost = EXCLUDED.monthly_avg_cost,
        maintenance_frequency = EXCLUDED.maintenance_frequency,
        downtime_rate = EXCLUDED.downtime_rate,
        calculated_at = now();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Trigger to auto-calculate on maintenance insert
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_calculate_vehicle_features()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.calculate_vehicle_features(NEW.vehicle_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on maintenance insert
DROP TRIGGER IF EXISTS trg_maintenance_calculate_features ON public.vehicle_maintenances;
CREATE TRIGGER trg_maintenance_calculate_features
AFTER INSERT ON public.vehicle_maintenances
FOR EACH ROW
EXECUTE FUNCTION public.trigger_calculate_vehicle_features();

-- Trigger on cost insert
DROP TRIGGER IF EXISTS trg_cost_calculate_features ON public.vehicle_costs;
CREATE TRIGGER trg_cost_calculate_features
AFTER INSERT ON public.vehicle_costs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_calculate_vehicle_features();

-- ============================================
-- 6. Trigger for status change on vehicles
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_vehicle_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM public.calculate_vehicle_features(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_vehicle_status_change ON public.vehicles;
CREATE TRIGGER trg_vehicle_status_change
AFTER UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_vehicle_status_change();

-- ============================================
-- 7. Function to update odometer from usage event
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_update_odometer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_odometer IS NOT NULL THEN
        UPDATE public.vehicles
        SET current_odometer = NEW.end_odometer,
            last_odometer_update = now()
        WHERE id = NEW.vehicle_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_usage_update_odometer ON public.vehicle_usage_events;
CREATE TRIGGER trg_usage_update_odometer
AFTER INSERT OR UPDATE ON public.vehicle_usage_events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_odometer();
