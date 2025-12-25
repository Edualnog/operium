-- Migration: 111_fix_duplicate_event_context.sql
-- Description: Fix duplicate key error on event_context by making the trigger function idempotent and dropping the trigger.

-- 1. Drop the trigger that causes automatic insertion (migration 108 also did this, but we enforce it here)
DROP TRIGGER IF EXISTS trg_auto_event_context ON public.domain_events;

-- 2. Update the function to be strictly idempotent and catch errors (safety net)
CREATE OR REPLACE FUNCTION public.fn_auto_event_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shift TEXT;
    v_hour INTEGER;
    v_day_of_week INTEGER;
BEGIN
    -- Validate NEW.id
    IF NEW.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Time calculations
    v_hour := EXTRACT(HOUR FROM NEW.occurred_at);
    v_day_of_week := EXTRACT(DOW FROM NEW.occurred_at);

    -- Shift logic
    IF v_day_of_week IN (0, 6) THEN
        v_shift := 'weekend';
    ELSIF v_hour >= 6 AND v_hour < 18 THEN
        v_shift := 'day';
    ELSE
        v_shift := 'night';
    END IF;

    -- Insert with conflict handling and error suppression
    BEGIN
        INSERT INTO public.event_context (
            event_id,
            shift,
            urgency_level,
            operational_pressure,
            was_outside_process,
            context_metadata,
            created_at
        ) VALUES (
            NEW.id,
            v_shift,
            'medium',
            'normal',
            FALSE,
            jsonb_build_object(
                'auto_generated', TRUE,
                'hour', v_hour,
                'day_of_week', v_day_of_week
            ),
            NOW()
        )
        ON CONFLICT (event_id) DO NOTHING;
    EXCEPTION 
        WHEN unique_violation THEN
            -- Already exists, ignore
            NULL;
        WHEN OTHERS THEN
            -- Log error but don't block the transaction
            RAISE WARNING 'Error in fn_auto_event_context (suppressed): %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;
