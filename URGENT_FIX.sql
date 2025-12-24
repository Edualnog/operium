-- ============================================================================
-- EMERGENCY FIX: Restore RLS policies and fix trigger
-- Execute this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: FIX FERRAMENTAS RLS (broken by 088 migration)
-- ============================================================================

-- Drop the broken consolidated policy
DROP POLICY IF EXISTS "ferramentas_authenticated_all" ON public.ferramentas;

-- Recreate proper policies for ferramentas
CREATE POLICY "ferramentas_select" ON public.ferramentas
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "ferramentas_insert" ON public.ferramentas
    FOR INSERT 
    TO authenticated
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "ferramentas_update" ON public.ferramentas
    FOR UPDATE 
    TO authenticated
    USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "ferramentas_delete" ON public.ferramentas
    FOR DELETE 
    TO authenticated
    USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 2: FIX TEAMS RLS
-- ============================================================================

DROP POLICY IF EXISTS "teams_authenticated_all" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "teams_insert" ON public.teams
    FOR INSERT 
    TO authenticated
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "teams_update" ON public.teams
    FOR UPDATE 
    TO authenticated
    USING (profile_id = (SELECT auth.uid()))
    WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY "teams_delete" ON public.teams
    FOR DELETE 
    TO authenticated
    USING (profile_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 3: FIX TEAM_EQUIPMENT RLS
-- ============================================================================

DROP POLICY IF EXISTS "team_equipment_authenticated_all" ON public.team_equipment;

CREATE POLICY "team_equipment_select" ON public.team_equipment
    FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "team_equipment_insert" ON public.team_equipment
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "team_equipment_update" ON public.team_equipment
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "team_equipment_delete" ON public.team_equipment
    FOR DELETE 
    TO authenticated
    USING (true);

-- ============================================================================
-- PART 4: LIST ALL TRIGGERS ON operium_events (for debug)
-- ============================================================================

SELECT tgname, tgfoid::regproc, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'public.operium_events'::regclass;

-- ============================================================================
-- PART 5: FORCE DROP ALL TRIGGERS on operium_events and recreate
-- ============================================================================

DO $$
DECLARE
    trig RECORD;
BEGIN
    -- Drop ALL triggers on operium_events
    FOR trig IN 
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'public.operium_events'::regclass
        AND NOT tgisinternal
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.operium_events', trig.tgname);
        RAISE NOTICE 'Dropped trigger: %', trig.tgname;
    END LOOP;
END $$;

-- ============================================================================
-- PART 6: DROP ALL versions of the sync function
-- ============================================================================

DROP FUNCTION IF EXISTS public.sync_vehicle_expense_to_costs() CASCADE;
DROP FUNCTION IF EXISTS sync_vehicle_expense_to_costs() CASCADE;

-- ============================================================================
-- PART 7: CREATE THE CORRECT FUNCTION
-- ============================================================================

CREATE FUNCTION public.sync_vehicle_expense_to_costs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tipo TEXT;
    v_valor NUMERIC;
    v_observacoes TEXT;
    v_foto_nf TEXT;
    v_reference_month DATE;
    v_team_id UUID;
BEGIN
    -- Only process VEHICLE_EXPENSE events  
    IF NEW.type != 'VEHICLE_EXPENSE' THEN
        RETURN NEW;
    END IF;

    -- Extract metadata from the event
    v_tipo := COALESCE((NEW.metadata->>'tipo')::TEXT, 'outros');
    v_valor := COALESCE((NEW.metadata->>'valor')::NUMERIC, 0);
    v_observacoes := (NEW.metadata->>'observacoes')::TEXT;
    v_foto_nf := (NEW.metadata->>'foto_nf')::TEXT;

    -- Use the first day of the month from event creation date
    v_reference_month := DATE_TRUNC('month', NEW.created_at)::DATE;

    -- Get team_id from the user who created the event (may be NULL)
    SELECT op.team_id INTO v_team_id
    FROM operium_profiles op
    WHERE op.user_id = NEW.actor_user_id
    AND op.active = true
    LIMIT 1;

    -- Insert into vehicle_costs
    INSERT INTO vehicle_costs (
        vehicle_id,
        reference_month,
        cost_type,
        amount,
        notes,
        receipt_url,
        team_id,
        collaborator_id,
        created_at
    ) VALUES (
        NEW.target_id,
        v_reference_month,
        v_tipo,
        v_valor,
        v_observacoes,
        v_foto_nf,
        v_team_id,
        NEW.actor_user_id,
        NEW.created_at
    );

    RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 8: CREATE THE TRIGGER
-- ============================================================================

CREATE TRIGGER trigger_sync_vehicle_expense
    AFTER INSERT ON public.operium_events
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_vehicle_expense_to_costs();

-- ============================================================================
-- PART 9: VERIFY
-- ============================================================================

-- Check triggers
SELECT tgname, tgfoid::regproc 
FROM pg_trigger 
WHERE tgrelid = 'public.operium_events'::regclass
AND NOT tgisinternal;

-- Check function source
SELECT substring(prosrc, 1, 200) as function_preview
FROM pg_proc 
WHERE proname = 'sync_vehicle_expense_to_costs';

-- ============================================================================
-- DONE! Try registering an expense now!
-- ============================================================================
