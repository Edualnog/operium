-- Migration: 081_fix_team_equipment_rls.sql
-- Description: Fix RLS policies for team_equipment to work with operium_profiles
-- Author: AI Assistant
-- Date: 2024-12-23

-- ============================================================================
-- FIX TEAM_EQUIPMENT RLS POLICY
-- ============================================================================

-- Drop the old policy
DROP POLICY IF EXISTS "Users can manage team equipment via team" ON public.team_equipment;

-- Create a more permissive policy that works with operium_profiles
-- Users can access team_equipment if they are an admin in the org that owns the team
CREATE POLICY "Users can manage team equipment in their org" ON public.team_equipment
    FOR ALL USING (
        team_id IN (
            SELECT t.id 
            FROM public.teams t
            WHERE t.org_id IN (
                SELECT op.org_id 
                FROM public.operium_profiles op 
                WHERE op.user_id = (SELECT auth.uid()) 
                  AND op.active = true
                  AND op.role IN ('ADMIN', 'WAREHOUSE')
            )
        )
    );

-- Also allow team members to view their team's equipment
CREATE POLICY "Team members can view their team equipment" ON public.team_equipment
    FOR SELECT USING (
        team_id IN (
            SELECT op.team_id 
            FROM public.operium_profiles op 
            WHERE op.user_id = (SELECT auth.uid()) 
              AND op.active = true
              AND op.team_id IS NOT NULL
        )
    );

COMMENT ON POLICY "Users can manage team equipment in their org" ON public.team_equipment IS
'Admins and warehouse users can manage all equipment for teams in their org';

COMMENT ON POLICY "Team members can view their team equipment" ON public.team_equipment IS
'Team members can view equipment assigned to their team';
