-- ============================================================================
-- Migration 117: Add user_name to field_reports
-- Problem:
--   Reports show "Usuário desconhecido" because operium_profiles.name is empty
-- Solution:
--   Store user name directly in field_reports for historical accuracy
-- ============================================================================

-- Add user_name column to field_reports
ALTER TABLE public.field_reports
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create index for searching by user name
CREATE INDEX IF NOT EXISTS idx_field_reports_user_name ON public.field_reports(user_name);

-- ============================================================================
-- BACKFILL: Update existing reports with user names
-- ============================================================================
-- Update from operium_profiles.name
UPDATE public.field_reports fr
SET user_name = op.name
FROM public.operium_profiles op
WHERE fr.user_id = op.user_id
  AND fr.user_name IS NULL
  AND op.name IS NOT NULL;

-- Update remaining from auth.users metadata
UPDATE public.field_reports fr
SET user_name = COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = fr.user_id),
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = fr.user_id),
    (SELECT email FROM auth.users WHERE id = fr.user_id)
)
WHERE fr.user_name IS NULL;

-- ============================================================================
-- TRIGGER: Automatically set user_name on insert
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_field_report_user_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only set if not already provided
    IF NEW.user_name IS NULL THEN
        -- Try to get from operium_profiles first
        SELECT name INTO NEW.user_name
        FROM operium_profiles
        WHERE user_id = NEW.user_id
          AND name IS NOT NULL
        LIMIT 1;
        
        -- If still null, try auth.users
        IF NEW.user_name IS NULL THEN
            SELECT COALESCE(
                raw_user_meta_data->>'full_name',
                raw_user_meta_data->>'name',
                email
            ) INTO NEW.user_name
            FROM auth.users
            WHERE id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_set_field_report_user_name ON public.field_reports;
CREATE TRIGGER trg_set_field_report_user_name
    BEFORE INSERT ON public.field_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.set_field_report_user_name();

-- ============================================================================
-- COMMENT
-- ============================================================================
COMMENT ON COLUMN public.field_reports.user_name IS
'User display name at the time of report creation. Captured for historical accuracy.';
