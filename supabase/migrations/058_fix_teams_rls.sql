-- Migration: 058_fix_teams_rls.sql
-- Description: Fixes RLS policies for teams and related tables to allow INSERT operations.
-- Issue: Original policies used FOR ALL with only USING, blocking inserts.

-- =============================================
-- TEAMS TABLE
-- =============================================
DROP POLICY IF EXISTS "Users can manage own teams" ON public.teams;

CREATE POLICY "Users can select own teams"
ON public.teams
FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own teams"
ON public.teams
FOR INSERT
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own teams"
ON public.teams
FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete own teams"
ON public.teams
FOR DELETE
USING (profile_id = auth.uid());

-- =============================================
-- TEAM MEMBERS
-- =============================================
DROP POLICY IF EXISTS "Users can manage team members via team" ON public.team_members;

CREATE POLICY "Users can select team members"
ON public.team_members
FOR SELECT
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can insert team members"
ON public.team_members
FOR INSERT
WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can update team members"
ON public.team_members
FOR UPDATE
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
)
WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can delete team members"
ON public.team_members
FOR DELETE
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

-- =============================================
-- TEAM EQUIPMENT
-- =============================================
DROP POLICY IF EXISTS "Users can manage team equipment via team" ON public.team_equipment;

CREATE POLICY "Users can select team equipment"
ON public.team_equipment
FOR SELECT
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can insert team equipment"
ON public.team_equipment
FOR INSERT
WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can update team equipment"
ON public.team_equipment
FOR UPDATE
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
)
WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can delete team equipment"
ON public.team_equipment
FOR DELETE
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

-- =============================================
-- TEAM ASSIGNMENTS
-- =============================================
DROP POLICY IF EXISTS "Users can manage team assignments via team" ON public.team_assignments;

CREATE POLICY "Users can select team assignments"
ON public.team_assignments
FOR SELECT
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can insert team assignments"
ON public.team_assignments
FOR INSERT
WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can update team assignments"
ON public.team_assignments
FOR UPDATE
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
)
WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can delete team assignments"
ON public.team_assignments
FOR DELETE
USING (
  team_id IN (SELECT id FROM public.teams WHERE profile_id = auth.uid())
);
