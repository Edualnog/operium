-- Migration: Corrigir FKs que referenciam auth.users diretamente
-- Descrição: Algumas tabelas referenciam auth.users diretamente (não via profiles)
-- Essas também precisam ser SET NULL para permitir deleção

-- collaborator_role_history.promoted_by
ALTER TABLE public.collaborator_role_history
DROP CONSTRAINT IF EXISTS collaborator_role_history_promoted_by_fkey;

ALTER TABLE public.collaborator_role_history
ADD CONSTRAINT collaborator_role_history_promoted_by_fkey
FOREIGN KEY (promoted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- equipment_issues.reported_by_user_id
ALTER TABLE public.equipment_issues
DROP CONSTRAINT IF EXISTS equipment_issues_reported_by_user_id_fkey;

ALTER TABLE public.equipment_issues
ADD CONSTRAINT equipment_issues_reported_by_user_id_fkey
FOREIGN KEY (reported_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- equipment_issues.resolved_by
ALTER TABLE public.equipment_issues
DROP CONSTRAINT IF EXISTS equipment_issues_resolved_by_fkey;

ALTER TABLE public.equipment_issues
ADD CONSTRAINT equipment_issues_resolved_by_fkey
FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- equipment_notifications.user_id
ALTER TABLE public.equipment_notifications
DROP CONSTRAINT IF EXISTS equipment_notifications_user_id_fkey;

ALTER TABLE public.equipment_notifications
ADD CONSTRAINT equipment_notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- field_reports.user_id
ALTER TABLE public.field_reports
DROP CONSTRAINT IF EXISTS field_reports_user_id_fkey;

ALTER TABLE public.field_reports
ADD CONSTRAINT field_reports_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- operium_events.actor_user_id
ALTER TABLE public.operium_events
DROP CONSTRAINT IF EXISTS operium_events_actor_user_id_fkey;

ALTER TABLE public.operium_events
ADD CONSTRAINT operium_events_actor_user_id_fkey
FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- team_equipment.accepted_by_user_id
ALTER TABLE public.team_equipment
DROP CONSTRAINT IF EXISTS team_equipment_accepted_by_user_id_fkey;

ALTER TABLE public.team_equipment
ADD CONSTRAINT team_equipment_accepted_by_user_id_fkey
FOREIGN KEY (accepted_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- team_equipment.admin_validated_by
ALTER TABLE public.team_equipment
DROP CONSTRAINT IF EXISTS team_equipment_admin_validated_by_fkey;

ALTER TABLE public.team_equipment
ADD CONSTRAINT team_equipment_admin_validated_by_fkey
FOREIGN KEY (admin_validated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- team_equipment.return_requested_by_user_id
ALTER TABLE public.team_equipment
DROP CONSTRAINT IF EXISTS team_equipment_return_requested_by_user_id_fkey;

ALTER TABLE public.team_equipment
ADD CONSTRAINT team_equipment_return_requested_by_user_id_fkey
FOREIGN KEY (return_requested_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- vehicle_costs.registered_by_user_id
ALTER TABLE public.vehicle_costs
DROP CONSTRAINT IF EXISTS vehicle_costs_registered_by_user_id_fkey;

ALTER TABLE public.vehicle_costs
ADD CONSTRAINT vehicle_costs_registered_by_user_id_fkey
FOREIGN KEY (registered_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- equipment_issues.org_id (referencia profiles, não auth.users)
ALTER TABLE public.equipment_issues
DROP CONSTRAINT IF EXISTS equipment_issues_org_id_fkey;

ALTER TABLE public.equipment_issues
ADD CONSTRAINT equipment_issues_org_id_fkey
FOREIGN KEY (org_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- equipment_notifications.org_id
ALTER TABLE public.equipment_notifications
DROP CONSTRAINT IF EXISTS equipment_notifications_org_id_fkey;

ALTER TABLE public.equipment_notifications
ADD CONSTRAINT equipment_notifications_org_id_fkey
FOREIGN KEY (org_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
