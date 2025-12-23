-- EXECUTE THIS TO FIX ALL RELATED TABLES

-- Disable RLS on teams table
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- Disable RLS on ferramentas table  
ALTER TABLE public.ferramentas DISABLE ROW LEVEL SECURITY;

-- team_equipment already disabled, but just to be sure:
ALTER TABLE public.team_equipment DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'ferramentas', 'team_equipment');
