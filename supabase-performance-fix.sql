-- =====================================================
-- CORREÇÕES DE PERFORMANCE RLS - EXECUTAR NO SQL EDITOR
-- =====================================================
-- Otimiza as políticas RLS para avaliar auth.uid() apenas uma vez

-- =====================================================
-- 1. PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- =====================================================
-- 2. COLABORADORES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own colaboradores" ON public.colaboradores;
CREATE POLICY "Users can view own colaboradores" ON public.colaboradores
  FOR SELECT USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own colaboradores" ON public.colaboradores;
CREATE POLICY "Users can insert own colaboradores" ON public.colaboradores
  FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own colaboradores" ON public.colaboradores;
CREATE POLICY "Users can update own colaboradores" ON public.colaboradores
  FOR UPDATE USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own colaboradores" ON public.colaboradores;
CREATE POLICY "Users can delete own colaboradores" ON public.colaboradores
  FOR DELETE USING (profile_id = (SELECT auth.uid()));

-- =====================================================
-- 3. FERRAMENTAS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own ferramentas" ON public.ferramentas;
CREATE POLICY "Users can view own ferramentas" ON public.ferramentas
  FOR SELECT USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own ferramentas" ON public.ferramentas;
CREATE POLICY "Users can insert own ferramentas" ON public.ferramentas
  FOR INSERT WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own ferramentas" ON public.ferramentas;
CREATE POLICY "Users can update own ferramentas" ON public.ferramentas
  FOR UPDATE USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ferramentas" ON public.ferramentas;
CREATE POLICY "Users can delete own ferramentas" ON public.ferramentas
  FOR DELETE USING (profile_id = (SELECT auth.uid()));

-- =====================================================
-- Após executar, clique em "Rerun linter" no Advisors
-- =====================================================

