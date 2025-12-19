-- Migration: 038_vehicle_assignment.sql
-- Description: Add current_driver_id to vehicles table to track assignment
-- Author: Antigravity
-- Date: 2024-12-19

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS current_driver_id UUID REFERENCES public.colaboradores(id);

COMMENT ON COLUMN public.vehicles.current_driver_id IS 'Current driver assigned to this vehicle';

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_current_driver ON public.vehicles(current_driver_id);
