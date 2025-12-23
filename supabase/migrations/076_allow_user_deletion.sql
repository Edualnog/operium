-- Migration: Ajustar Foreign Keys para permitir deleção de usuários
-- =====================================================================
-- 
-- Problema: Ao demitir um colaborador, queremos poder deletar o registro
-- do auth.users para liberar o email. Porém, várias tabelas têm FKs que
-- bloqueiam essa deleção.
--
-- Solução:
-- 1. Tabelas de história/auditoria: SET NULL (preserva histórico)
-- 2. Tabelas de perfil: CASCADE (deleta junto com o usuário)

-- =====================================================================
-- 1. operium_events.actor_user_id - SET NULL
-- =====================================================================
-- Mantém o evento mas remove referência ao usuário deletado

ALTER TABLE public.operium_events 
DROP CONSTRAINT IF EXISTS operium_events_actor_user_id_fkey;

ALTER TABLE public.operium_events
ADD CONSTRAINT operium_events_actor_user_id_fkey 
FOREIGN KEY (actor_user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- =====================================================================
-- 2. field_reports.user_id - SET NULL
-- =====================================================================
-- Mantém o relatório mas remove referência ao usuário

ALTER TABLE public.field_reports
DROP CONSTRAINT IF EXISTS field_reports_user_id_fkey;

-- Primeiro, tornar a coluna nullable se não for
ALTER TABLE public.field_reports 
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.field_reports
ADD CONSTRAINT field_reports_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- =====================================================================
-- 3. collaborator_role_history.promoted_by - SET NULL
-- =====================================================================
-- Mantém histórico de promoções mas remove referência ao usuário

ALTER TABLE public.collaborator_role_history
DROP CONSTRAINT IF EXISTS collaborator_role_history_promoted_by_fkey;

ALTER TABLE public.collaborator_role_history
ADD CONSTRAINT collaborator_role_history_promoted_by_fkey 
FOREIGN KEY (promoted_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- =====================================================================
-- 4. operium_profiles.user_id - CASCADE
-- =====================================================================
-- Quando deletar usuário, deleta o perfil operium junto

ALTER TABLE public.operium_profiles
DROP CONSTRAINT IF EXISTS operium_profiles_user_id_fkey;

ALTER TABLE public.operium_profiles
ADD CONSTRAINT operium_profiles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- =====================================================================
-- 5. profiles.id - CASCADE
-- =====================================================================
-- Quando deletar usuário, deleta o perfil junto

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- =====================================================================
-- COMENTÁRIO SOBRE A ESTRATÉGIA
-- =====================================================================
-- 
-- Com essas alterações:
-- - Podemos chamar supabase.auth.admin.deleteUser(userId) 
-- - O profiles e operium_profiles são deletados automaticamente (CASCADE)
-- - Históricos e eventos são preservados com actor_user_id = NULL
-- - O email fica liberado para reutilização
--
-- A API /api/operium/users/delete pode agora:
-- 1. Marcar colaborador como DEMITIDO (se existir na tabela colaboradores)
-- 2. Chamar supabase.auth.admin.deleteUser(userId)
-- 3. Profiles são removidos automaticamente
