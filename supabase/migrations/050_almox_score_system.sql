-- Migration: 050_almox_score_system.sql
-- Description: Sistema de pontuação gamificada para colaboradores (Almox Score)
-- Calcula score baseado em comportamento: devoluções, tempo de uso, cuidado com ferramentas

-- ============================================================================
-- 1. FUNÇÃO: CALCULAR ALMOX SCORE PARA UM COLABORADOR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_almox_score(p_colaborador_id UUID)
RETURNS TABLE(score INTEGER, level TEXT) AS $$
DECLARE
    v_total_retiradas INTEGER;
    v_total_devolucoes INTEGER;
    v_total_consertos_relacionados INTEGER;
    v_taxa_devolucao NUMERIC;
    v_penalidade_consertos NUMERIC;
    v_score_bruto NUMERIC;
    v_score_final INTEGER;
    v_level TEXT;
BEGIN
    -- Buscar métricas do colaborador (apenas ferramentas, não consumíveis)
    SELECT 
        COALESCE(SUM(CASE WHEN m.tipo = 'retirada' THEN m.quantidade ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN m.tipo = 'devolucao' THEN m.quantidade ELSE 0 END), 0)
    INTO v_total_retiradas, v_total_devolucoes
    FROM public.movimentacoes m
    JOIN public.ferramentas f ON f.id = m.ferramenta_id
    WHERE m.colaborador_id = p_colaborador_id
      AND f.tipo_item = 'ferramenta';
    
    -- Contar consertos relacionados ao colaborador (ferramenta usada e depois foi para conserto)
    SELECT COALESCE(COUNT(DISTINCT c.id), 0)
    INTO v_total_consertos_relacionados
    FROM public.consertos c
    JOIN public.movimentacoes m ON m.ferramenta_id = c.ferramenta_id
    WHERE m.colaborador_id = p_colaborador_id
      AND m.tipo = 'retirada'
      AND m.data < c.data_envio;
    
    -- Calcular taxa de devolução (0 a 1)
    IF v_total_retiradas > 0 THEN
        v_taxa_devolucao := LEAST(1.0, v_total_devolucoes::NUMERIC / v_total_retiradas);
    ELSE
        v_taxa_devolucao := 0.5; -- Neutro para quem não tem histórico
    END IF;
    
    -- Penalidade por consertos (cada conserto reduz 50 pontos, max 200)
    v_penalidade_consertos := LEAST(200, v_total_consertos_relacionados * 50);
    
    -- Score base: 500 (neutro) + bônus por taxa de devolução (até +400) - penalidades
    -- Taxa de 100% devolução = +400 pontos (score 900)
    -- Taxa de 50% devolução = +200 pontos (score 700)
    -- Taxa de 0% devolução = 0 pontos (score 500)
    v_score_bruto := 500 + (v_taxa_devolucao * 400) - v_penalidade_consertos;
    
    -- Bônus adicional por volume de operações bem-sucedidas
    IF v_total_retiradas >= 50 AND v_taxa_devolucao >= 0.9 THEN
        v_score_bruto := v_score_bruto + 100; -- Bônus veterano confiável
    ELSIF v_total_retiradas >= 20 AND v_taxa_devolucao >= 0.8 THEN
        v_score_bruto := v_score_bruto + 50; -- Bônus intermediário
    END IF;
    
    -- Limitar score entre 100 e 1000
    v_score_final := GREATEST(100, LEAST(1000, v_score_bruto::INTEGER));
    
    -- Determinar level baseado no score
    v_level := CASE
        WHEN v_score_final >= 800 THEN 'MASTER'
        WHEN v_score_final >= 600 THEN 'PRO'
        WHEN v_score_final >= 400 THEN 'MEMBER'
        ELSE 'NEWBIE'
    END;
    
    RETURN QUERY SELECT v_score_final, v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.calculate_almox_score IS 'Calcula o Almox Score e nível de um colaborador baseado em suas movimentações';

-- ============================================================================
-- 2. FUNÇÃO: ATUALIZAR SCORE DE UM COLABORADOR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_colaborador_score(p_colaborador_id UUID)
RETURNS VOID AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Calcular novo score
    SELECT * INTO v_result FROM public.calculate_almox_score(p_colaborador_id);
    
    -- Atualizar na tabela colaboradores
    UPDATE public.colaboradores
    SET 
        almox_score = v_result.score,
        level = v_result.level
    WHERE id = p_colaborador_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.update_colaborador_score IS 'Atualiza o almox_score e level de um colaborador';

-- ============================================================================
-- 3. FUNÇÃO: RECALCULAR TODOS OS SCORES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_almox_scores()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_colaborador RECORD;
BEGIN
    FOR v_colaborador IN SELECT id FROM public.colaboradores LOOP
        PERFORM public.update_colaborador_score(v_colaborador.id);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.recalculate_all_almox_scores IS 'Recalcula o Almox Score de todos os colaboradores';

-- ============================================================================
-- 4. TRIGGER: ATUALIZAR SCORE APÓS MOVIMENTAÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_almox_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar score do colaborador envolvido
    IF NEW.colaborador_id IS NOT NULL THEN
        PERFORM public.update_colaborador_score(NEW.colaborador_id);
    END IF;
    
    -- Para devoluções, também atualizar se o colaborador original da retirada for diferente
    IF TG_OP = 'INSERT' AND NEW.tipo = 'devolucao' AND OLD IS NOT NULL AND OLD.colaborador_id IS NOT NULL THEN
        IF OLD.colaborador_id != NEW.colaborador_id THEN
            PERFORM public.update_colaborador_score(OLD.colaborador_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger na tabela movimentações
DROP TRIGGER IF EXISTS trg_update_almox_score ON public.movimentacoes;
CREATE TRIGGER trg_update_almox_score
    AFTER INSERT OR UPDATE ON public.movimentacoes
    FOR EACH ROW
    WHEN (NEW.tipo IN ('retirada', 'devolucao'))
    EXECUTE FUNCTION public.trigger_update_almox_score();

COMMENT ON TRIGGER trg_update_almox_score ON public.movimentacoes IS 'Atualiza o Almox Score do colaborador após cada movimentação';

-- ============================================================================
-- 5. GARANTIR DEFAULTS NA TABELA COLABORADORES
-- ============================================================================

-- Adicionar colunas se não existirem (com valores default)
DO $$
BEGIN
    -- almox_score com default 500
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'colaboradores' AND column_name = 'almox_score') THEN
        ALTER TABLE public.colaboradores ADD COLUMN almox_score INTEGER DEFAULT 500;
    END IF;
    
    -- level com default 'MEMBER'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'colaboradores' AND column_name = 'level') THEN
        ALTER TABLE public.colaboradores ADD COLUMN level TEXT DEFAULT 'MEMBER';
    END IF;
END $$;

-- Atualizar colaboradores sem score
UPDATE public.colaboradores 
SET almox_score = 500, level = 'MEMBER' 
WHERE almox_score IS NULL OR level IS NULL;

-- ============================================================================
-- 6. RECALCULAR SCORES EXISTENTES
-- ============================================================================

-- Executar recálculo inicial para todos os colaboradores
SELECT public.recalculate_all_almox_scores();
