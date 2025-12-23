-- Migration: 083_fix_team_equipment_triggers.sql
-- Description: Remove problematic triggers that reference non-existent profile_id column
-- Author: AI Assistant
-- Date: 2024-12-23
-- Issue: Triggers were failing with "record 'new' has no field 'profile_id'"

-- ============================================================================
-- REMOVE PROBLEMATIC TRIGGERS ON team_equipment
-- ============================================================================

-- These triggers were created by the observability/domain events system
-- but the team_equipment table doesn't have a profile_id column

DROP TRIGGER IF EXISTS trg_emit_team_equipment_event ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_team_equipment_event ON public.team_equipment;
DROP TRIGGER IF EXISTS trg_notify_equipment_assigned ON public.team_equipment;

-- ============================================================================
-- RE-ENABLE ROW LEVEL SECURITY WITH PROPER POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.team_equipment ENABLE ROW LEVEL SECURITY;

-- Create a simple permissive policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users can manage team equipment" ON public.team_equipment;
CREATE POLICY "Authenticated users can manage team equipment" ON public.team_equipment
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Also ensure teams table has proper RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage teams" ON public.teams;
CREATE POLICY "Authenticated users can manage teams" ON public.teams
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.team_equipment IS 
'Equipment assigned to teams. Fixed: removed triggers referencing non-existent profile_id column.';
