-- Migration: 094_restore_teams_org_isolation.sql
-- Description: Restore organization-based RLS policies for teams module
-- Author: AI Assistant
-- Date: 2024-12-24
--
-- Issue: Either Migration 088 wasn't applied or policies from 079 still exist.
-- This migration is idempotent and will work regardless of current state.
--
-- Fix: Drop ALL possible existing policies, then create org-based policies.
-- ============================================================================

-- ============================================================================
-- 1. RESTORE TEAMS RLS POLICIES
-- ============================================================================

-- Drop ALL possible existing policies (from 079 and 088)
DROP POLICY IF EXISTS "teams_authenticated_all" ON public.teams;
DROP POLICY IF EXISTS "teams_select_org" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_org" ON public.teams;
DROP POLICY IF EXISTS "teams_update_org" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_org" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can manage teams" ON public.teams;
DROP POLICY IF EXISTS "Operium users can view org teams" ON public.teams;

-- Create org-based policies
CREATE POLICY "teams_select_org" ON public.teams
FOR SELECT USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())  -- Fallback for teams without org_id
);

CREATE POLICY "teams_insert_org" ON public.teams
FOR INSERT WITH CHECK (
    -- Auto-set org_id if not provided (trigger handles this)
    COALESCE(org_id, (SELECT get_user_org_id())) = (SELECT get_user_org_id())
);

CREATE POLICY "teams_update_org" ON public.teams
FOR UPDATE USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
) WITH CHECK (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
);

CREATE POLICY "teams_delete_org" ON public.teams
FOR DELETE USING (
    org_id = (SELECT get_user_org_id())
    OR profile_id = (SELECT auth.uid())
);

-- ============================================================================
-- 2. RESTORE TEAM_EQUIPMENT RLS POLICIES
-- ============================================================================

-- Drop ALL possible existing policies
DROP POLICY IF EXISTS "team_equipment_authenticated_all" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_select_org" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_insert_org" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_update_org" ON public.team_equipment;
DROP POLICY IF EXISTS "team_equipment_delete_org" ON public.team_equipment;
DROP POLICY IF EXISTS "Authenticated users can manage team equipment" ON public.team_equipment;

-- Create org-based policies
CREATE POLICY "team_equipment_select_org" ON public.team_equipment
FOR SELECT USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_equipment_insert_org" ON public.team_equipment
FOR INSERT WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_equipment_update_org" ON public.team_equipment
FOR UPDATE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
) WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_equipment_delete_org" ON public.team_equipment
FOR DELETE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- 3. RESTORE TEAM_MEMBERS RLS POLICIES
-- ============================================================================

-- Drop ALL possible existing policies
DROP POLICY IF EXISTS "Users can manage team members via team" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_org" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_org" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_org" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_org" ON public.team_members;

-- Create org-based policies
CREATE POLICY "team_members_select_org" ON public.team_members
FOR SELECT USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_members_insert_org" ON public.team_members
FOR INSERT WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_members_update_org" ON public.team_members
FOR UPDATE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
) WITH CHECK (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

CREATE POLICY "team_members_delete_org" ON public.team_members
FOR DELETE USING (
    team_id IN (
        SELECT id FROM public.teams
        WHERE org_id = (SELECT get_user_org_id())
           OR profile_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- 4. ENSURE org_id COLUMN EXISTS AND IS POPULATED
-- ============================================================================

-- This should already be done by migration 079, but verify
DO $$
BEGIN
    -- Check if org_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'teams'
        AND column_name = 'org_id'
    ) THEN
        RAISE EXCEPTION 'Column teams.org_id does not exist. Migration 079 may not have run.';
    END IF;

    -- Update any teams still missing org_id
    UPDATE public.teams t
    SET org_id = (
        SELECT op.org_id
        FROM public.operium_profiles op
        WHERE op.user_id = t.profile_id
        AND op.active = true
        LIMIT 1
    )
    WHERE t.org_id IS NULL;
END $$;

-- ============================================================================
-- 5. VERIFY TRIGGER EXISTS
-- ============================================================================

-- Ensure the auto-fill trigger from 079 is still active
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_teams_auto_org_id'
    ) THEN
        -- Recreate the trigger
        CREATE TRIGGER trg_teams_auto_org_id
            BEFORE INSERT ON public.teams
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_teams_auto_org_id();
    END IF;
END $$;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON POLICY "teams_select_org" ON public.teams IS
'Users can view teams from their organization (via org_id) or teams they created (fallback)';

COMMENT ON POLICY "teams_insert_org" ON public.teams IS
'Users can only create teams in their own organization';

COMMENT ON POLICY "teams_update_org" ON public.teams IS
'Users can only update teams from their organization';

COMMENT ON POLICY "teams_delete_org" ON public.teams IS
'Users can only delete teams from their organization';

COMMENT ON POLICY "team_equipment_select_org" ON public.team_equipment IS
'Users can view equipment assigned to teams in their organization';

COMMENT ON POLICY "team_equipment_insert_org" ON public.team_equipment IS
'Users can only assign equipment to teams in their organization';

COMMENT ON POLICY "team_equipment_update_org" ON public.team_equipment IS
'Users can only update equipment assignments for teams in their organization';

COMMENT ON POLICY "team_equipment_delete_org" ON public.team_equipment IS
'Users can only delete equipment assignments for teams in their organization';

COMMENT ON POLICY "team_members_select_org" ON public.team_members IS
'Users can view team members from their organization';

COMMENT ON POLICY "team_members_insert_org" ON public.team_members IS
'Users can only add members to teams in their organization';

COMMENT ON POLICY "team_members_update_org" ON public.team_members IS
'Users can only update team members in their organization';

COMMENT ON POLICY "team_members_delete_org" ON public.team_members IS
'Users can only remove team members from their organization';
