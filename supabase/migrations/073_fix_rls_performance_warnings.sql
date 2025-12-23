-- ============================================================================
-- FIX: RLS Performance Warnings from Supabase Linter
-- ============================================================================
-- 1. Replace auth.uid() with (select auth.uid()) for better performance
-- 2. Remove duplicate permissive policies
-- ============================================================================

-- ============================================================================
-- PART 1: Fix auth_rls_initplan warnings (wrap auth.uid() in subquery)
-- ============================================================================

-- Fix: vehicles - "Operium users can view org vehicles"
DROP POLICY IF EXISTS "Operium users can view org vehicles" ON vehicles;
CREATE POLICY "Operium users can view org vehicles" ON vehicles
    FOR SELECT USING (
        profile_id IN (
            SELECT op.org_id FROM operium_profiles op 
            WHERE op.user_id = (SELECT auth.uid()) AND op.active = true
        )
    );

-- Fix: teams - "Operium users can view org teams"
DROP POLICY IF EXISTS "Operium users can view org teams" ON teams;
CREATE POLICY "Operium users can view org teams" ON teams
    FOR SELECT USING (
        profile_id IN (
            SELECT op.org_id FROM operium_profiles op 
            WHERE op.user_id = (SELECT auth.uid()) AND op.active = true
        )
    );

-- Fix: operium_profiles - "Users can update own operium profile"
DROP POLICY IF EXISTS "Users can update own operium profile" ON operium_profiles;
CREATE POLICY "Users can update own operium profile" ON operium_profiles
    FOR UPDATE USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix: operium_events - "Org owners can view their operium events"
DROP POLICY IF EXISTS "Org owners can view their operium events" ON operium_events;
CREATE POLICY "Org owners can view their operium events" ON operium_events
    FOR SELECT USING (
        org_id IN (
            SELECT op.org_id FROM operium_profiles op 
            WHERE op.user_id = (SELECT auth.uid()) AND op.active = true
        )
    );

-- Fix: field_reports - "Users can insert their own reports"
DROP POLICY IF EXISTS "Users can insert their own reports" ON field_reports;
CREATE POLICY "Users can insert their own reports" ON field_reports
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix: field_reports - "Users can update their own reports"
DROP POLICY IF EXISTS "Users can update their own reports" ON field_reports;
CREATE POLICY "Users can update their own reports" ON field_reports
    FOR UPDATE USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix: field_reports - "Users can view their org reports"
DROP POLICY IF EXISTS "Users can view their org reports" ON field_reports;
CREATE POLICY "Users can view their org reports" ON field_reports
    FOR SELECT USING (
        org_id IN (
            SELECT op.org_id FROM operium_profiles op 
            WHERE op.user_id = (SELECT auth.uid()) AND op.active = true
        )
    );

-- ============================================================================
-- PART 2: Remove duplicate permissive policies
-- ============================================================================

-- operium_events: Remove duplicate SELECT policy (keep operium_events_select_own_org)
-- The "Org owners can view their operium events" was recreated above, now drop the old one
DROP POLICY IF EXISTS "operium_events_select_own_org" ON operium_events;

-- operium_profiles: Keep only "Users can update own operium profile" (more permissive)
-- Already recreated above, remove the admin-only one for UPDATE
DROP POLICY IF EXISTS "operium_profiles_update_admin" ON operium_profiles;

-- teams: Remove duplicate SELECT policy
DROP POLICY IF EXISTS "Users can select own teams" ON teams;

-- vehicles: Remove duplicate SELECT policy  
DROP POLICY IF EXISTS "Users can select own vehicles" ON vehicles;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "Operium users can view org vehicles" ON vehicles IS 
'Unified SELECT policy for vehicles - uses (select auth.uid()) for performance';

COMMENT ON POLICY "Operium users can view org teams" ON teams IS 
'Unified SELECT policy for teams - uses (select auth.uid()) for performance';
