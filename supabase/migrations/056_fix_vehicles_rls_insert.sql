-- Migration: 056_fix_vehicles_rls_insert.sql
-- Description: Fixes RLS policy for vehicles table to allow INSERT operations.
-- Issue: The original policy used FOR ALL with USING but not WITH CHECK, blocking inserts.

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.vehicles;

-- Create proper SELECT policy
CREATE POLICY "Users can select own vehicles"
ON public.vehicles
FOR SELECT
USING (profile_id = auth.uid());

-- Create proper INSERT policy
CREATE POLICY "Users can insert own vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- Create proper UPDATE policy
CREATE POLICY "Users can update own vehicles"
ON public.vehicles
FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Create proper DELETE policy
CREATE POLICY "Users can delete own vehicles"
ON public.vehicles
FOR DELETE
USING (profile_id = auth.uid());
