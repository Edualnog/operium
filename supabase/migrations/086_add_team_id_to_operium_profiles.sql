-- Migration: 086_add_team_id_to_operium_profiles.sql
-- Description: Add team_id column to operium_profiles to link field users to their assigned team
-- Author: AI Assistant
-- Date: 2024-12-23
-- 
-- This enables the Field app to display the team name and vehicle info
-- ============================================================================

-- ============================================================================
-- 1. ADD team_id COLUMN TO operium_profiles
-- ============================================================================

ALTER TABLE public.operium_profiles 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. INDEX FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_operium_profiles_team_id 
ON public.operium_profiles(team_id) 
WHERE team_id IS NOT NULL;

-- ============================================================================
-- 3. COMMENT
-- ============================================================================

COMMENT ON COLUMN public.operium_profiles.team_id IS 
'Links the operium user to a team, enabling team/vehicle info display in the field app.';

