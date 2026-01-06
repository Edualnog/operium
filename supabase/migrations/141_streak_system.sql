-- ============================================================================
-- Migration 141: Sistema de Streaks para Gamificação
-- Adiciona tracking de dias consecutivos de atividade
-- ============================================================================

-- 1. Adicionar colunas de streak na tabela colaboradores
ALTER TABLE public.colaboradores
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS streak_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Comentários explicativos
COMMENT ON COLUMN public.colaboradores.current_streak IS
'Número de dias consecutivos com atividade. Reseta se ficar mais de 1 dia sem ação.';

COMMENT ON COLUMN public.colaboradores.max_streak IS
'Maior streak já alcançado pelo colaborador. Usado para badges/conquistas.';

COMMENT ON COLUMN public.colaboradores.last_activity_date IS
'Data da última atividade registrada. Usado para calcular continuidade do streak.';

-- 3. Função para atualizar streak do colaborador
CREATE OR REPLACE FUNCTION update_colaborador_streak(p_colaborador_id UUID)
RETURNS TABLE(
  new_streak INTEGER,
  is_new_record BOOLEAN,
  streak_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_max_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_new_streak INTEGER;
  v_is_record BOOLEAN := FALSE;
  v_message TEXT := '';
BEGIN
  -- Buscar dados atuais do colaborador
  SELECT
    last_activity_date,
    COALESCE(current_streak, 0),
    COALESCE(max_streak, 0)
  INTO v_last_date, v_current_streak, v_max_streak
  FROM public.colaboradores
  WHERE id = p_colaborador_id;

  -- Calcular novo streak
  IF v_last_date IS NULL THEN
    -- Primeira atividade
    v_new_streak := 1;
    v_message := 'first_activity';
  ELSIF v_last_date = v_today THEN
    -- Já teve atividade hoje, manter streak atual
    v_new_streak := v_current_streak;
    v_message := 'same_day';
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Atividade ontem, incrementar streak
    v_new_streak := v_current_streak + 1;
    v_message := 'streak_continued';
  ELSE
    -- Mais de 1 dia sem atividade, resetar
    v_new_streak := 1;
    v_message := 'streak_reset';
  END IF;

  -- Verificar se é novo recorde
  IF v_new_streak > v_max_streak THEN
    v_is_record := TRUE;
    v_max_streak := v_new_streak;
  END IF;

  -- Atualizar colaborador
  UPDATE public.colaboradores
  SET
    current_streak = v_new_streak,
    max_streak = v_max_streak,
    last_activity_date = v_today,
    streak_updated_at = NOW()
  WHERE id = p_colaborador_id;

  -- Retornar resultado
  RETURN QUERY SELECT v_new_streak, v_is_record, v_message;
END;
$$;

-- 4. Função para buscar info de streak do colaborador atual
CREATE OR REPLACE FUNCTION get_my_streak()
RETURNS TABLE(
  current_streak INTEGER,
  max_streak INTEGER,
  last_activity_date DATE,
  days_until_lost INTEGER,
  streak_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_colaborador_id UUID;
  v_last_date DATE;
  v_current INTEGER;
  v_max INTEGER;
  v_today DATE := CURRENT_DATE;
  v_days_left INTEGER;
  v_status TEXT;
BEGIN
  -- Buscar colaborador_id do usuário atual
  SELECT po.collaborator_id INTO v_colaborador_id
  FROM public.operium_profiles po
  WHERE po.user_id = auth.uid();

  IF v_colaborador_id IS NULL THEN
    RETURN;
  END IF;

  -- Buscar dados de streak
  SELECT
    c.last_activity_date,
    COALESCE(c.current_streak, 0),
    COALESCE(c.max_streak, 0)
  INTO v_last_date, v_current, v_max
  FROM public.colaboradores c
  WHERE c.id = v_colaborador_id;

  -- Calcular dias até perder streak
  IF v_last_date IS NULL THEN
    v_days_left := 0;
    v_status := 'no_streak';
  ELSIF v_last_date = v_today THEN
    v_days_left := 1;
    v_status := 'active_today';
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    v_days_left := 0;
    v_status := 'needs_action';
  ELSE
    v_days_left := 0;
    v_current := 0; -- Streak perdido
    v_status := 'streak_lost';
  END IF;

  RETURN QUERY SELECT v_current, v_max, v_last_date, v_days_left, v_status;
END;
$$;

-- 5. Trigger para atualizar streak automaticamente em ações
CREATE OR REPLACE FUNCTION trigger_update_streak_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_colaborador_id UUID;
BEGIN
  -- Determinar colaborador_id baseado na tabela
  IF TG_TABLE_NAME = 'movimentacoes' THEN
    v_colaborador_id := NEW.colaborador_id;
  ELSIF TG_TABLE_NAME = 'field_reports' THEN
    -- Para relatórios, buscar via user_id
    SELECT po.collaborator_id INTO v_colaborador_id
    FROM public.operium_profiles po
    WHERE po.user_id = NEW.user_id;
  END IF;
  -- Note: team_equipment não atualiza streak pois é ação do admin, não do colaborador

  -- Atualizar streak se encontrou colaborador
  IF v_colaborador_id IS NOT NULL THEN
    PERFORM public.update_colaborador_streak(v_colaborador_id);
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Aplicar trigger nas tabelas de atividade
DROP TRIGGER IF EXISTS trg_streak_movimentacoes ON public.movimentacoes;
CREATE TRIGGER trg_streak_movimentacoes
  AFTER INSERT ON public.movimentacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_streak_on_activity();

-- Note: Removido trigger de team_equipment pois atribuição é ação do admin, não do colaborador

DROP TRIGGER IF EXISTS trg_streak_field_reports ON public.field_reports;
CREATE TRIGGER trg_streak_field_reports
  AFTER INSERT ON public.field_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_streak_on_activity();

-- 7. Índice para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_streak
ON public.colaboradores(current_streak DESC, max_streak DESC);

-- 8. Grant permissões
GRANT EXECUTE ON FUNCTION public.update_colaborador_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_streak() TO authenticated;
