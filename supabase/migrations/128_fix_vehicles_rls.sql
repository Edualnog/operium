-- Migration: Garantir RLS habilitado em vehicles e recriar policies
-- Problema: Erro 406 ao criar veículo

-- Habilitar RLS se não estiver
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Recriar policies (drop e create para garantir que estão corretas)
DROP POLICY IF EXISTS "Users can select own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;

-- SELECT: usuário pode ver seus próprios veículos
CREATE POLICY "Users can select own vehicles"
ON public.vehicles
FOR SELECT
USING (profile_id = auth.uid());

-- INSERT: usuário pode criar veículos para si
CREATE POLICY "Users can insert own vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- UPDATE: usuário pode atualizar seus próprios veículos
CREATE POLICY "Users can update own vehicles"
ON public.vehicles
FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- DELETE: usuário pode deletar seus próprios veículos
CREATE POLICY "Users can delete own vehicles"
ON public.vehicles
FOR DELETE
USING (profile_id = auth.uid());
