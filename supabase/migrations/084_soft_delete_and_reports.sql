-- Add deleted_at to teams for soft delete
ALTER TABLE public.teams
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add team_id to field_reports for historical context
ALTER TABLE public.field_reports
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Update RLS policies for teams to exclude deleted teams by default for regular queries
-- (Admins or specific historical queries might need to bypass this, but standard app usage should ignore deleted teams)

-- Note: We are not changing the RLS policy immediately to strictly enforce "deleted_at IS NULL" 
-- because it might break existing queries. The application logic (getTeams) will handle the filtering first.
-- However, we should ensure the deleted_at column is accessible.

-- Create index for performance
CREATE INDEX idx_teams_deleted_at ON public.teams(deleted_at);
CREATE INDEX idx_field_reports_team_id ON public.field_reports(team_id);
