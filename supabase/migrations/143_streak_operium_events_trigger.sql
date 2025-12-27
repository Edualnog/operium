-- ============================================================================
-- Migration 143: Add streak trigger to operium_events
-- Atualiza streak quando qualquer evento é registrado
-- ============================================================================

-- Trigger para atualizar streak em operium_events
CREATE OR REPLACE FUNCTION trigger_update_streak_on_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_colaborador_id UUID;
BEGIN
  -- Buscar colaborador_id via actor_user_id
  SELECT po.colaborador_id INTO v_colaborador_id
  FROM public.profiles_operium po
  WHERE po.profile_id = NEW.actor_user_id;

  -- Atualizar streak se encontrou colaborador
  IF v_colaborador_id IS NOT NULL THEN
    PERFORM public.update_colaborador_streak(v_colaborador_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela operium_events
DROP TRIGGER IF EXISTS trg_streak_operium_events ON public.operium_events;
CREATE TRIGGER trg_streak_operium_events
  AFTER INSERT ON public.operium_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_streak_on_event();

-- Grant permissão
GRANT EXECUTE ON FUNCTION public.trigger_update_streak_on_event() TO authenticated;
