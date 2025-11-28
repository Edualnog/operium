-- =====================================================
-- OTIMIZAÇÃO DE PERFORMANCE DAS POLÍTICAS RLS
-- =====================================================
-- Troca auth.uid() por (select auth.uid()) para evitar
-- reavaliação a cada linha, melhorando performance.
-- =====================================================

-- =====================================================
-- 1. INVENTARIOS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own inventarios" ON inventarios;
DROP POLICY IF EXISTS "Users can insert own inventarios" ON inventarios;
DROP POLICY IF EXISTS "Users can update own inventarios" ON inventarios;
DROP POLICY IF EXISTS "Users can delete own inventarios" ON inventarios;

CREATE POLICY "Users can view own inventarios" ON inventarios
  FOR SELECT USING (profile_id = (select auth.uid()));

CREATE POLICY "Users can insert own inventarios" ON inventarios
  FOR INSERT WITH CHECK (profile_id = (select auth.uid()));

CREATE POLICY "Users can update own inventarios" ON inventarios
  FOR UPDATE USING (profile_id = (select auth.uid()));

CREATE POLICY "Users can delete own inventarios" ON inventarios
  FOR DELETE USING (profile_id = (select auth.uid()));

-- =====================================================
-- 2. INVENTARIO_ITENS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own inventario_itens" ON inventario_itens;
DROP POLICY IF EXISTS "Users can insert own inventario_itens" ON inventario_itens;
DROP POLICY IF EXISTS "Users can update own inventario_itens" ON inventario_itens;
DROP POLICY IF EXISTS "Users can delete own inventario_itens" ON inventario_itens;

CREATE POLICY "Users can view own inventario_itens" ON inventario_itens
  FOR SELECT USING (
    inventario_id IN (
      SELECT id FROM inventarios WHERE profile_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own inventario_itens" ON inventario_itens
  FOR INSERT WITH CHECK (
    inventario_id IN (
      SELECT id FROM inventarios WHERE profile_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own inventario_itens" ON inventario_itens
  FOR UPDATE USING (
    inventario_id IN (
      SELECT id FROM inventarios WHERE profile_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own inventario_itens" ON inventario_itens
  FOR DELETE USING (
    inventario_id IN (
      SELECT id FROM inventarios WHERE profile_id = (select auth.uid())
    )
  );

-- =====================================================
-- 3. INVENTARIO_AJUSTES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own inventario_ajustes" ON inventario_ajustes;
DROP POLICY IF EXISTS "Users can insert own inventario_ajustes" ON inventario_ajustes;
DROP POLICY IF EXISTS "Users can update own inventario_ajustes" ON inventario_ajustes;
DROP POLICY IF EXISTS "Users can delete own inventario_ajustes" ON inventario_ajustes;

CREATE POLICY "Users can view own inventario_ajustes" ON inventario_ajustes
  FOR SELECT USING (
    inventario_item_id IN (
      SELECT ii.id FROM inventario_itens ii
      JOIN inventarios i ON ii.inventario_id = i.id
      WHERE i.profile_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own inventario_ajustes" ON inventario_ajustes
  FOR INSERT WITH CHECK (
    inventario_item_id IN (
      SELECT ii.id FROM inventario_itens ii
      JOIN inventarios i ON ii.inventario_id = i.id
      WHERE i.profile_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own inventario_ajustes" ON inventario_ajustes
  FOR UPDATE USING (
    inventario_item_id IN (
      SELECT ii.id FROM inventario_itens ii
      JOIN inventarios i ON ii.inventario_id = i.id
      WHERE i.profile_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own inventario_ajustes" ON inventario_ajustes
  FOR DELETE USING (
    inventario_item_id IN (
      SELECT ii.id FROM inventario_itens ii
      JOIN inventarios i ON ii.inventario_id = i.id
      WHERE i.profile_id = (select auth.uid())
    )
  );

-- =====================================================
-- 4. TERMOS_RESPONSABILIDADE
-- =====================================================
DROP POLICY IF EXISTS "Users can view own termos" ON termos_responsabilidade;
DROP POLICY IF EXISTS "Users can create own termos" ON termos_responsabilidade;
DROP POLICY IF EXISTS "Users can update own termos" ON termos_responsabilidade;
DROP POLICY IF EXISTS "Users can delete own termos" ON termos_responsabilidade;

CREATE POLICY "Users can view own termos" ON termos_responsabilidade
  FOR SELECT USING (profile_id = (select auth.uid()));

CREATE POLICY "Users can create own termos" ON termos_responsabilidade
  FOR INSERT WITH CHECK (profile_id = (select auth.uid()));

CREATE POLICY "Users can update own termos" ON termos_responsabilidade
  FOR UPDATE USING (profile_id = (select auth.uid()));

CREATE POLICY "Users can delete own termos" ON termos_responsabilidade
  FOR DELETE USING (profile_id = (select auth.uid()));

-- =====================================================
-- PRONTO! Todas as políticas foram otimizadas.
-- =====================================================

