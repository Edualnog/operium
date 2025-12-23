-- Migration: 080_equipment_workflow.sql
-- Description: Equipment assignment workflow with collaborator acceptance and admin validation
-- Author: AI Assistant
-- Date: 2024-12-23
-- ============================================================================

-- ============================================================================
-- 1. ADD STATUS TRACKING TO TEAM_EQUIPMENT
-- ============================================================================

-- Add status column to track equipment lifecycle
ALTER TABLE public.team_equipment 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_acceptance' 
CHECK (status IN ('pending_acceptance', 'accepted', 'in_use', 'pending_return', 'returned', 'returned_with_issue'));

-- Add acceptance tracking
ALTER TABLE public.team_equipment 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE public.team_equipment 
ADD COLUMN IF NOT EXISTS accepted_by_user_id UUID REFERENCES auth.users(id);

-- Add return request tracking
ALTER TABLE public.team_equipment 
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;

ALTER TABLE public.team_equipment 
ADD COLUMN IF NOT EXISTS return_requested_by_user_id UUID REFERENCES auth.users(id);

-- Add admin validation tracking
ALTER TABLE public.team_equipment 
ADD COLUMN IF NOT EXISTS admin_validated_at TIMESTAMPTZ;

ALTER TABLE public.team_equipment 
ADD COLUMN IF NOT EXISTS admin_validated_by UUID REFERENCES auth.users(id);

-- Update existing records to 'accepted' status (legacy records)
UPDATE public.team_equipment 
SET status = CASE 
    WHEN returned_at IS NOT NULL THEN 'returned'
    ELSE 'accepted' -- Assume previously assigned items are already accepted
END
WHERE status = 'pending_acceptance';

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_team_equipment_status 
ON public.team_equipment(team_id, status) 
WHERE returned_at IS NULL;

-- ============================================================================
-- 2. CREATE EQUIPMENT_ISSUES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_equipment_id UUID NOT NULL REFERENCES public.team_equipment(id) ON DELETE CASCADE,
    reported_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    org_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Issue details
    issue_type TEXT NOT NULL CHECK (issue_type IN ('damage', 'malfunction', 'loss', 'wear', 'other')),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    
    -- Location context (optional)
    location TEXT,
    
    -- Photo evidence (optional)
    photo_url TEXT,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_issues_equipment 
ON public.equipment_issues(team_equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_issues_org 
ON public.equipment_issues(org_id);

CREATE INDEX IF NOT EXISTS idx_equipment_issues_unresolved 
ON public.equipment_issues(org_id) 
WHERE resolved_at IS NULL;

-- RLS
ALTER TABLE public.equipment_issues ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view/create issues for equipment in their org
CREATE POLICY "Users can manage equipment issues in their org" 
ON public.equipment_issues
FOR ALL USING (
    org_id IN (
        SELECT org_id FROM public.operium_profiles 
        WHERE user_id = (SELECT auth.uid()) AND active = true
    )
);

COMMENT ON TABLE public.equipment_issues IS 
'Field-reported issues/damages for equipment during operation.';

-- ============================================================================
-- 3. CREATE EQUIPMENT_NOTIFICATIONS TABLE  
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_equipment_id UUID REFERENCES public.team_equipment(id) ON DELETE CASCADE,
    
    -- Notification content
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'equipment_assigned',
        'equipment_accepted',
        'issue_reported',
        'return_requested',
        'return_validated'
    )),
    title TEXT NOT NULL,
    message TEXT,
    
    -- Status
    read_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_notifications_user 
ON public.equipment_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_equipment_notifications_unread 
ON public.equipment_notifications(user_id) 
WHERE read_at IS NULL;

-- RLS
ALTER TABLE public.equipment_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.equipment_notifications
FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Policy: Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications" 
ON public.equipment_notifications
FOR UPDATE USING (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.equipment_notifications IS 
'Notifications for equipment assignments and workflow events.';

-- ============================================================================
-- 4. TRIGGER: UPDATE TIMESTAMPS ON EQUIPMENT_ISSUES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_equipment_issues_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trg_equipment_issues_updated_at ON public.equipment_issues;
CREATE TRIGGER trg_equipment_issues_updated_at
    BEFORE UPDATE ON public.equipment_issues
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_equipment_issues_timestamp();

-- ============================================================================
-- 5. FUNCTION: CREATE NOTIFICATION ON EQUIPMENT ASSIGNMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_notify_equipment_assigned()
RETURNS TRIGGER AS $$
DECLARE
    v_team_name TEXT;
    v_ferramenta_nome TEXT;
    v_team_member_users UUID[];
BEGIN
    -- Only trigger on INSERT (new assignment)
    IF TG_OP = 'INSERT' THEN
        -- Get team name
        SELECT name INTO v_team_name 
        FROM public.teams 
        WHERE id = NEW.team_id;
        
        -- Get ferramenta name
        SELECT nome INTO v_ferramenta_nome 
        FROM public.ferramentas 
        WHERE id = NEW.ferramenta_id;
        
        -- Get all active operium_profiles linked to this team
        SELECT ARRAY_AGG(op.user_id) INTO v_team_member_users
        FROM public.operium_profiles op
        WHERE op.team_id = NEW.team_id
          AND op.active = true;
        
        -- Create notification for each team member
        IF v_team_member_users IS NOT NULL THEN
            INSERT INTO public.equipment_notifications (
                user_id, 
                org_id,
                team_equipment_id, 
                notification_type, 
                title, 
                message
            )
            SELECT 
                unnest(v_team_member_users),
                (SELECT org_id FROM public.operium_profiles WHERE team_id = NEW.team_id AND active = true LIMIT 1),
                NEW.id,
                'equipment_assigned',
                'Novo equipamento atribuído',
                'Equipamento "' || COALESCE(v_ferramenta_nome, 'Sem nome') || '" foi atribuído à equipe "' || COALESCE(v_team_name, 'Sem nome') || '". Confirme o recebimento.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_notify_equipment_assigned ON public.team_equipment;
CREATE TRIGGER trg_notify_equipment_assigned
    AFTER INSERT ON public.team_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_equipment_assigned();

-- ============================================================================
-- 6. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.equipment_issues TO authenticated;
GRANT SELECT, UPDATE ON public.equipment_notifications TO authenticated;

-- Allow system to insert notifications (via trigger)
GRANT INSERT ON public.equipment_notifications TO authenticated;

-- ============================================================================
-- 7. VIEW: PENDING EQUIPMENT ACCEPTANCES
-- ============================================================================

CREATE OR REPLACE VIEW public.v_pending_equipment_acceptance AS
SELECT 
    te.id,
    te.team_id,
    te.ferramenta_id,
    te.quantity,
    te.assigned_at,
    te.status,
    t.name AS team_name,
    f.nome AS ferramenta_nome,
    op.user_id,
    op.name AS user_name
FROM public.team_equipment te
JOIN public.teams t ON t.id = te.team_id
JOIN public.ferramentas f ON f.id = te.ferramenta_id
JOIN public.operium_profiles op ON op.team_id = te.team_id AND op.active = true
WHERE te.status = 'pending_acceptance'
  AND te.returned_at IS NULL;

ALTER VIEW public.v_pending_equipment_acceptance SET (security_invoker = on);

GRANT SELECT ON public.v_pending_equipment_acceptance TO authenticated;

COMMENT ON VIEW public.v_pending_equipment_acceptance IS 
'Equipment pending acceptance by team members.';

