-- Migration: 055_fix_missing_vehicle_value.sql
-- Description: Ensures acquisition_value column exists in vehicles table.
-- Why: Appears to have been lost or not applied in some environments despite 037.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicles' 
        AND column_name = 'acquisition_value'
    ) THEN
        ALTER TABLE public.vehicles ADD COLUMN acquisition_value numeric DEFAULT 0;
    END IF;
END $$;
