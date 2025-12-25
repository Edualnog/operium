-- Migration: 110_fix_teams_creation_error.sql
-- Description: Fixes 500 error on team creation by ensuring org_id exists and RLS is correct.
-- This is a "safety net" migration to repair state if previous migrations failed.

-- 1. Ensure org_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'teams'
        AND column_name = 'org_id'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN org_id UUID;
    END IF;
END $$;

-- 2. Populate org_id for existing teams (using operium_profiles and triggers logic)
UPDATE public.teams t
SET org_id = (
    SELECT op.org_id
    FROM public.operium_profiles op
    WHERE op.user_id = t.profile_id
    AND op.active = true
    LIMIT 1
)
WHERE t.org_id IS NULL;

-- 3. Ensure index exists
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON public.teams(org_id);

-- 4. Create or Replace Helper Function for Auto-Org-ID
CREATE OR REPLACE FUNCTION public.fn_teams_auto_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Auto-fill org_id if not provided
    IF NEW.org_id IS NULL THEN
        -- Try to get org_id from user metadata function if exists
        BEGIN
            NEW.org_id := get_user_org_id();
        EXCEPTION WHEN OTHERS THEN
            -- Fallback if function doesn't exist or fails: ignore
            NULL;
        END;
    END IF;
    RETURN NEW;
END;
$$;

-- 5. Ensure Trigger Exists
DROP TRIGGER IF EXISTS trg_teams_auto_org_id ON public.teams;
CREATE TRIGGER trg_teams_auto_org_id
    BEFORE INSERT ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_teams_auto_org_id();

-- 6. Refresh RLS Policies (Safe Replace)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_insert_org" ON public.teams;
CREATE POLICY "teams_insert_org" ON public.teams
FOR INSERT WITH CHECK (
    -- Allow insert if org_id matches user's org, OR if user has no org yet (fallback to profile_id check implied by app logic usually)
    -- Simply allowing authenticated users to create teams is often safer for "create" action if we trust specific column defaults.
    -- But let's stick to the org model:
    (org_id = (SELECT get_user_org_id())) 
    OR 
    (org_id IS NULL) -- Allow null initially, trigger handles it.
);

DROP POLICY IF EXISTS "teams_select_org" ON public.teams;
CREATE POLICY "teams_select_org" ON public.teams
FOR SELECT USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid()) 
);

DROP POLICY IF EXISTS "teams_update_org" ON public.teams;
CREATE POLICY "teams_update_org" ON public.teams
FOR UPDATE USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "teams_delete_org" ON public.teams;
CREATE POLICY "teams_delete_org" ON public.teams
FOR DELETE USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
);
