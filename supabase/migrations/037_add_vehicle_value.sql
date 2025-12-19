-- Migration: 037_add_vehicle_value.sql
-- Description: Adds acquisition_value to vehicles for equity calculation.

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS acquisition_value numeric DEFAULT 0;
