-- Migration: 033_protect_operational_profile.sql
-- Purpose: Add trigger to protect role_function and seniority_bucket from modification
-- Author: Antigravity
-- Date: 2024-12-18

-- =============================================================================
-- TRIGGER: Protect operational profile fields from modification
-- Once role_function and seniority_bucket are set, they cannot be changed
-- =============================================================================

CREATE OR REPLACE FUNCTION protect_operational_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- If role_function was already set, prevent modification
    IF OLD.role_function IS NOT NULL AND NEW.role_function IS DISTINCT FROM OLD.role_function THEN
        RAISE EXCEPTION 'role_function cannot be modified once set (immutable field)';
    END IF;
    
    -- If seniority_bucket was already set, prevent modification
    IF OLD.seniority_bucket IS NOT NULL AND NEW.seniority_bucket IS DISTINCT FROM OLD.seniority_bucket THEN
        RAISE EXCEPTION 'seniority_bucket cannot be modified once set (immutable field)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS protect_operational_profile_trigger ON public.collaborator_operational_profile;
CREATE TRIGGER protect_operational_profile_trigger
    BEFORE UPDATE ON public.collaborator_operational_profile
    FOR EACH ROW
    EXECUTE FUNCTION protect_operational_profile_fields();

COMMENT ON FUNCTION protect_operational_profile_fields() IS 'Protects role_function and seniority_bucket from modification once set. These are onboarding-style immutable fields.';
