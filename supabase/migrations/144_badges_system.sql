-- ============================================================================
-- Migration 144: Sistema de Badges/Conquistas
-- Gamificação com conquistas desbloqueáveis
-- ============================================================================

-- 1. Tabela de definição de badges
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL, -- emoji ou nome do ícone
  categoria TEXT NOT NULL, -- 'streak', 'acoes', 'responsabilidade', 'especial'
  criterio_tipo TEXT NOT NULL, -- 'streak_dias', 'total_acoes', 'devolucoes', 'hora_acao', etc
  criterio_valor INTEGER, -- valor numérico do critério (ex: 7 para 7 dias)
  xp_bonus INTEGER DEFAULT 0, -- XP ganho ao desbloquear
  raridade TEXT DEFAULT 'comum', -- 'comum', 'raro', 'epico', 'lendario'
  ordem INTEGER DEFAULT 0, -- ordem de exibição
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de badges conquistados por colaborador
CREATE TABLE IF NOT EXISTS public.colaborador_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE, -- se já foi notificado ao usuário
  UNIQUE(colaborador_id, badge_id)
);

-- 3. Inserir badges padrão
INSERT INTO public.badges (id, nome, descricao, icone, categoria, criterio_tipo, criterio_valor, xp_bonus, raridade, ordem) VALUES
  -- Badges de Streak
  ('first_action', 'Primeira Ação', 'Completou sua primeira ação no app', 'star', 'especial', 'total_acoes', 1, 50, 'comum', 1),
  ('streak_3', 'Iniciante', '3 dias seguidos de atividade', 'flame', 'streak', 'streak_dias', 3, 30, 'comum', 2),
  ('streak_7', 'Streak de Ferro', '7 dias seguidos de atividade', 'flame', 'streak', 'streak_dias', 7, 100, 'raro', 3),
  ('streak_14', 'Duas Semanas', '14 dias seguidos de atividade', 'flame', 'streak', 'streak_dias', 14, 200, 'raro', 4),
  ('streak_30', 'Streak de Ouro', '30 dias seguidos de atividade', 'trophy', 'streak', 'streak_dias', 30, 500, 'epico', 5),
  ('streak_60', 'Streak de Diamante', '60 dias seguidos de atividade', 'gem', 'streak', 'streak_dias', 60, 1000, 'lendario', 6),

  -- Badges de Ações
  ('acoes_10', 'Ativo', '10 ações completadas', 'zap', 'acoes', 'total_acoes', 10, 50, 'comum', 10),
  ('acoes_50', 'Produtivo', '50 ações completadas', 'zap', 'acoes', 'total_acoes', 50, 150, 'raro', 11),
  ('acoes_100', 'Máquina', '100 ações completadas', 'rocket', 'acoes', 'total_acoes', 100, 300, 'epico', 12),
  ('acoes_500', 'Lenda', '500 ações completadas', 'crown', 'acoes', 'total_acoes', 500, 1000, 'lendario', 13),

  -- Badges de Responsabilidade (devoluções)
  ('devolucoes_10', 'Responsável', '10 ferramentas devolvidas', 'package', 'responsabilidade', 'devolucoes', 10, 50, 'comum', 20),
  ('devolucoes_50', 'Confiável', '50 ferramentas devolvidas', 'shield', 'responsabilidade', 'devolucoes', 50, 150, 'raro', 21),
  ('devolucoes_100', 'Guardião', '100 ferramentas devolvidas', 'shield', 'responsabilidade', 'devolucoes', 100, 300, 'epico', 22),

  -- Badges Especiais
  ('madrugador', 'Madrugador', 'Fez uma ação antes das 7h', 'sunrise', 'especial', 'hora_acao', 7, 100, 'raro', 30),
  ('coruja', 'Coruja', 'Fez uma ação depois das 22h', 'moon', 'especial', 'hora_acao', 22, 100, 'raro', 31),
  ('fim_de_semana', 'Dedicado', 'Fez uma ação no fim de semana', 'calendar', 'especial', 'dia_semana', 0, 75, 'raro', 32)
ON CONFLICT (id) DO NOTHING;

-- 4. Função para verificar e conceder badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_colaborador_id UUID)
RETURNS TABLE(
  badge_id TEXT,
  badge_nome TEXT,
  badge_icone TEXT,
  xp_ganho INTEGER,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_streak INTEGER;
  v_max_streak INTEGER;
  v_total_acoes INTEGER;
  v_total_devolucoes INTEGER;
  v_hora_atual INTEGER;
  v_dia_semana INTEGER;
  v_badge RECORD;
  v_already_has BOOLEAN;
  v_criteria_met BOOLEAN;
  v_total_xp INTEGER := 0;
BEGIN
  -- Buscar dados do colaborador
  SELECT
    COALESCE(current_streak, 0),
    COALESCE(max_streak, 0)
  INTO v_current_streak, v_max_streak
  FROM public.colaboradores
  WHERE id = p_colaborador_id;

  -- Contar total de ações (eventos)
  SELECT COUNT(*) INTO v_total_acoes
  FROM public.operium_events oe
  JOIN public.operium_profiles op ON op.user_id = oe.actor_user_id
  WHERE op.collaborator_id = p_colaborador_id;

  -- Contar total de devoluções
  SELECT COALESCE(SUM(quantidade), 0) INTO v_total_devolucoes
  FROM public.movimentacoes
  WHERE colaborador_id = p_colaborador_id AND tipo = 'devolucao';

  -- Hora atual e dia da semana
  v_hora_atual := EXTRACT(HOUR FROM NOW());
  v_dia_semana := EXTRACT(DOW FROM NOW()); -- 0 = domingo, 6 = sábado

  -- Verificar cada badge
  FOR v_badge IN SELECT * FROM public.badges ORDER BY ordem LOOP
    -- Verificar se já tem o badge
    SELECT EXISTS(
      SELECT 1 FROM public.colaborador_badges
      WHERE colaborador_id = p_colaborador_id AND badge_id = v_badge.id
    ) INTO v_already_has;

    IF v_already_has THEN
      CONTINUE;
    END IF;

    -- Verificar critério
    v_criteria_met := FALSE;

    CASE v_badge.criterio_tipo
      WHEN 'streak_dias' THEN
        v_criteria_met := v_max_streak >= v_badge.criterio_valor;
      WHEN 'total_acoes' THEN
        v_criteria_met := v_total_acoes >= v_badge.criterio_valor;
      WHEN 'devolucoes' THEN
        v_criteria_met := v_total_devolucoes >= v_badge.criterio_valor;
      WHEN 'hora_acao' THEN
        IF v_badge.id = 'madrugador' THEN
          v_criteria_met := v_hora_atual < 7;
        ELSIF v_badge.id = 'coruja' THEN
          v_criteria_met := v_hora_atual >= 22;
        END IF;
      WHEN 'dia_semana' THEN
        v_criteria_met := v_dia_semana IN (0, 6); -- domingo ou sábado
      ELSE
        v_criteria_met := FALSE;
    END CASE;

    -- Se critério atendido, conceder badge
    IF v_criteria_met THEN
      INSERT INTO public.colaborador_badges (colaborador_id, badge_id)
      VALUES (p_colaborador_id, v_badge.id)
      ON CONFLICT (colaborador_id, badge_id) DO NOTHING;

      -- Adicionar XP ao colaborador
      UPDATE public.colaboradores
      SET almox_score = COALESCE(almox_score, 500) + v_badge.xp_bonus
      WHERE id = p_colaborador_id;

      v_total_xp := v_total_xp + v_badge.xp_bonus;

      -- Retornar badge conquistado
      RETURN QUERY SELECT
        v_badge.id,
        v_badge.nome,
        v_badge.icone,
        v_badge.xp_bonus,
        TRUE;
    END IF;
  END LOOP;
END;
$$;

-- 5. Função para buscar badges do colaborador atual
CREATE OR REPLACE FUNCTION get_my_badges()
RETURNS TABLE(
  badge_id TEXT,
  nome TEXT,
  descricao TEXT,
  icone TEXT,
  categoria TEXT,
  raridade TEXT,
  xp_bonus INTEGER,
  earned_at TIMESTAMP WITH TIME ZONE,
  is_earned BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_colaborador_id UUID;
BEGIN
  -- Buscar colaborador_id do usuário atual
  SELECT po.collaborator_id INTO v_colaborador_id
  FROM public.operium_profiles po
  WHERE po.user_id = auth.uid();

  IF v_colaborador_id IS NULL THEN
    RETURN;
  END IF;

  -- Retornar todos os badges com status de conquista
  RETURN QUERY
  SELECT
    b.id,
    b.nome,
    b.descricao,
    b.icone,
    b.categoria,
    b.raridade,
    b.xp_bonus,
    cb.earned_at,
    (cb.id IS NOT NULL) as is_earned
  FROM public.badges b
  LEFT JOIN public.colaborador_badges cb
    ON cb.badge_id = b.id AND cb.colaborador_id = v_colaborador_id
  ORDER BY b.ordem;
END;
$$;

-- 6. Trigger para verificar badges após cada ação
CREATE OR REPLACE FUNCTION trigger_check_badges_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_colaborador_id UUID;
BEGIN
  -- Buscar colaborador_id via actor_user_id
  SELECT po.collaborator_id INTO v_colaborador_id
  FROM public.operium_profiles po
  WHERE po.user_id = NEW.actor_user_id;

  -- Verificar badges se encontrou colaborador
  IF v_colaborador_id IS NOT NULL THEN
    PERFORM public.check_and_award_badges(v_colaborador_id);
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Aplicar trigger na tabela operium_events
DROP TRIGGER IF EXISTS trg_badges_operium_events ON public.operium_events;
CREATE TRIGGER trg_badges_operium_events
  AFTER INSERT ON public.operium_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_badges_on_event();

-- 8. Habilitar RLS nas tabelas
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para badges (leitura pública, apenas admin pode modificar)
CREATE POLICY "Badges são visíveis para todos autenticados"
ON public.badges FOR SELECT
TO authenticated
USING (true);

-- Políticas para colaborador_badges
CREATE POLICY "Usuários podem ver seus próprios badges"
ON public.colaborador_badges FOR SELECT
TO authenticated
USING (
  colaborador_id IN (
    SELECT op.collaborator_id
    FROM public.operium_profiles op
    WHERE op.user_id = (select auth.uid())
  )
);

CREATE POLICY "Sistema pode inserir badges conquistados"
ON public.colaborador_badges FOR INSERT
TO authenticated
WITH CHECK (
  colaborador_id IN (
    SELECT op.collaborator_id
    FROM public.operium_profiles op
    WHERE op.user_id = (select auth.uid())
  )
);

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_colaborador_badges_colaborador
ON public.colaborador_badges(colaborador_id);

CREATE INDEX IF NOT EXISTS idx_colaborador_badges_badge
ON public.colaborador_badges(badge_id);

CREATE INDEX IF NOT EXISTS idx_badges_categoria
ON public.badges(categoria);

-- 10. Grant permissões
GRANT SELECT ON public.badges TO authenticated;
GRANT SELECT, INSERT ON public.colaborador_badges TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_badges() TO authenticated;

-- 11. Comentários
COMMENT ON TABLE public.badges IS 'Definição de badges/conquistas disponíveis no sistema';
COMMENT ON TABLE public.colaborador_badges IS 'Badges conquistados por cada colaborador';
