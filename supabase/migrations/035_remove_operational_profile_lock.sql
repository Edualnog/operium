-- Migration: 035_remove_operational_profile_lock.sql
-- Description: Remove the trigger that prevents updates to role_function and seniority_bucket
-- Reason: These fields need to be updatable via Promotion (role) and Auto-Update (seniority) features.
--         Immutability is now enforced only at the UI level for standard editing.

DROP TRIGGER IF EXISTS protect_operational_profile_trigger ON public.collaborator_operational_profile;
DROP FUNCTION IF EXISTS protect_operational_profile_fields();
