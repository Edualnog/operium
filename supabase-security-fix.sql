-- =====================================================
-- CORREÇÕES DE SEGURANÇA - EXECUTAR NO SQL EDITOR DO SUPABASE
-- =====================================================

-- 1. Corrigir calcular_tmr
CREATE OR REPLACE FUNCTION public.calcular_tmr(p_profile_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  media_retirada numeric;
BEGIN
  SELECT AVG(EXTRACT(EPOCH FROM (
    COALESCE(
      (SELECT MIN(m2.data) FROM movimentacoes m2 
       WHERE m2.ferramenta_id = m.ferramenta_id 
       AND m2.tipo = 'devolucao' 
       AND m2.data > m.data
       AND m2.profile_id = p_profile_id),
      NOW()
    ) - m.data
  )) / 86400)
  INTO media_retirada
  FROM movimentacoes m
  WHERE m.profile_id = p_profile_id
  AND m.tipo = 'retirada';
  
  RETURN COALESCE(media_retirada, 0);
END;
$$;

-- 2. Corrigir calcular_indice_atraso
CREATE OR REPLACE FUNCTION public.calcular_indice_atraso(p_profile_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_retiradas integer;
  total_atrasadas integer;
BEGIN
  SELECT COUNT(*) INTO total_retiradas
  FROM movimentacoes
  WHERE profile_id = p_profile_id AND tipo = 'retirada';
  
  IF total_retiradas = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO total_atrasadas
  FROM movimentacoes m
  WHERE m.profile_id = p_profile_id
  AND m.tipo = 'retirada'
  AND m.prazo_devolucao IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM movimentacoes m2 
    WHERE m2.ferramenta_id = m.ferramenta_id 
    AND m2.tipo = 'devolucao' 
    AND m2.data <= m.prazo_devolucao
    AND m2.profile_id = p_profile_id
  );
  
  RETURN (total_atrasadas::numeric / total_retiradas::numeric) * 100;
END;
$$;

-- 3. Corrigir calcular_score_responsabilidade  
CREATE OR REPLACE FUNCTION public.calcular_score_responsabilidade(p_profile_id uuid, p_colaborador_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_retiradas integer;
  devolucoes_no_prazo integer;
BEGIN
  SELECT COUNT(*) INTO total_retiradas
  FROM movimentacoes
  WHERE profile_id = p_profile_id 
  AND colaborador_id = p_colaborador_id 
  AND tipo = 'retirada';
  
  IF total_retiradas = 0 THEN
    RETURN 100;
  END IF;
  
  SELECT COUNT(*) INTO devolucoes_no_prazo
  FROM movimentacoes m
  WHERE m.profile_id = p_profile_id
  AND m.colaborador_id = p_colaborador_id
  AND m.tipo = 'retirada'
  AND EXISTS (
    SELECT 1 FROM movimentacoes m2 
    WHERE m2.ferramenta_id = m.ferramenta_id 
    AND m2.colaborador_id = m.colaborador_id
    AND m2.tipo = 'devolucao' 
    AND (m.prazo_devolucao IS NULL OR m2.data <= m.prazo_devolucao)
    AND m2.profile_id = p_profile_id
  );
  
  RETURN (devolucoes_no_prazo::numeric / total_retiradas::numeric) * 100;
END;
$$;

-- 4. Corrigir calcular_risco_ruptura
CREATE OR REPLACE FUNCTION public.calcular_risco_ruptura(p_profile_id uuid, p_ferramenta_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quantidade_atual integer;
  ponto_resuprimento integer;
  consumo_medio numeric;
  dias_estoque numeric;
  risco numeric;
BEGIN
  SELECT quantidade_disponivel, ponto_ressuprimento
  INTO quantidade_atual, ponto_resuprimento
  FROM ferramentas
  WHERE id = p_ferramenta_id AND profile_id = p_profile_id;
  
  IF quantidade_atual IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT COALESCE(AVG(quantidade), 0)
  INTO consumo_medio
  FROM movimentacoes
  WHERE ferramenta_id = p_ferramenta_id
  AND profile_id = p_profile_id
  AND tipo = 'retirada'
  AND data >= NOW() - INTERVAL '30 days';
  
  IF consumo_medio = 0 THEN
    RETURN 0;
  END IF;
  
  dias_estoque := quantidade_atual / consumo_medio;
  
  IF dias_estoque <= 0 THEN
    risco := 100;
  ELSIF dias_estoque <= 7 THEN
    risco := 100 - (dias_estoque * 10);
  ELSIF dias_estoque <= 14 THEN
    risco := 30 - ((dias_estoque - 7) * 3);
  ELSE
    risco := GREATEST(0, 10 - (dias_estoque - 14));
  END IF;
  
  RETURN GREATEST(0, LEAST(100, risco));
END;
$$;

-- 5. Corrigir handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, created_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6. Revogar acesso público à foreign table stripe_subscriptions
REVOKE ALL ON public.stripe_subscriptions FROM anon, authenticated;

-- =====================================================
-- APÓS EXECUTAR, VÁ EM:
-- Authentication > Settings > Security
-- E ative "Leaked Password Protection"
-- =====================================================

