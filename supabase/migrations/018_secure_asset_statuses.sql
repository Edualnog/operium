-- Migration: 018_secure_asset_statuses.sql
-- Description: Enable RLS on asset_statuses to fix Security Advisor warning
-- Author: Antigravity Agent

-- 1. Enable RLS
ALTER TABLE IF EXISTS public.asset_statuses ENABLE ROW LEVEL SECURITY;

-- 2. Add Read-Only Policy for Authenticated Users
-- Assuming this is a reference table, we allow all authenticated users to read.
DROP POLICY IF EXISTS "Authenticated users can read asset_statuses" ON public.asset_statuses;

CREATE POLICY "Authenticated users can read asset_statuses"
ON public.asset_statuses
FOR SELECT
TO authenticated
USING (true);

-- 3. (Optional) Audit/Maintenance
-- Use this migration to also fix any other loose ends if needed.
