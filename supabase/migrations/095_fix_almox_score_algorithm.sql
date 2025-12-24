-- Migration: 095_fix_almox_score_algorithm.sql
-- Description: Corrigir algoritmo do Almox Score para combinar responsabilidade e cuidado
-- Author: AI Assistant
-- Date: 2024-12-24
--
-- Mudanças:
-- - Responsabilidade: Taxa de devolução (devolver tudo = +300 pts)
-- - Cuidado: Ferramentas sem quebrar (sem consertos = +200 pts)
-- - Penalidades: Consertos reduzem score
-- - Bônus: Volume de atividade (para quem é responsável)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_almox_score(p_colaborador_id UUID)
RETURNS TABLE(score INTEGER, level TEXT) AS $$
DECLARE
    v_total_retiradas INTEGER;
    v_total_devolucoes INTEGER;
    v_total_consertos_relacionados INTEGER;
    v_taxa_devolucao NUMERIC;
    v_score_responsabilidade NUMERIC;
    v_score_cuidado NUMERIC;
    v_penalidade_consertos NUMERIC;
    v_bonus_volume NUMERIC;
    v_score_bruto NUMERIC;
    v_score_final INTEGER;
    v_level TEXT;
BEGIN
    -- ========================================================================
    -- 1. BUSCAR MÉTRICAS DO COLABORADOR (apenas ferramentas)
    -- ========================================================================
    SELECT 
        COALESCE(SUM(CASE WHEN m.tipo = 'retirada' THEN m.quantidade ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN m.tipo = 'devolucao' THEN m.quantidade ELSE 0 END), 0)
    INTO v_total_retiradas, v_total_devolucoes
    FROM public.movimentacoes m
    JOIN public.ferramentas f ON f.id = m.ferramenta_id
    WHERE m.colaborador_id = p_colaborador_id
      AND f.tipo_item = 'ferramenta';
    
    -- Contar consertos relacionados ao colaborador
    -- (ferramenta foi retirada por ele e depois foi para conserto)
    SELECT COALESCE(COUNT(DISTINCT c.id), 0)
    INTO v_total_consertos_relacionados
    FROM public.consertos c
    JOIN public.movimentacoes m ON m.ferramenta_id = c.ferramenta_id
    WHERE m.colaborador_id = p_colaborador_id
      AND m.tipo = 'retirada'
      AND m.data < c.data_envio;
    
    -- ========================================================================
    -- 2. CALCULAR SCORE DE RESPONSABILIDADE (0 a 300 pontos)
    -- ========================================================================
    -- Taxa de devolução: devoluções / retiradas
    -- 100% devolução = +300 pts
    -- 50% devolução = +150 pts
    -- 0% devolução = 0 pts
    -- Sem histórico = neutro (0 pts)
    
    IF v_total_retiradas > 0 THEN
        v_taxa_devolucao := LEAST(1.0, v_total_devolucoes::NUMERIC / v_total_retiradas);
        v_score_responsabilidade := v_taxa_devolucao * 300;
    ELSE
        -- Sem atividade = neutro (não ganha nem perde pontos)
        v_taxa_devolucao := 0;
        v_score_responsabilidade := 0;
    END IF;
    
    -- ========================================================================
    -- 3. CALCULAR SCORE DE CUIDADO (0 a 200 pontos)
    -- ========================================================================
    -- Quanto menos consertos, melhor
    -- MAS: Só dá pontos se tiver atividade (não recompensa quem nunca usou nada)
    -- 0 consertos COM atividade = +200 pts (cuidado perfeito)
    -- 1 conserto = +150 pts
    -- 2 consertos = +100 pts
    -- 3 consertos = +50 pts
    -- 4+ consertos = 0 pts
    -- SEM atividade = 0 pts (neutro)
    
    IF v_total_retiradas > 0 THEN
        -- Tem atividade: avaliar cuidado baseado em consertos
        v_score_cuidado := CASE
            WHEN v_total_consertos_relacionados = 0 THEN 200  -- Perfeito
            WHEN v_total_consertos_relacionados = 1 THEN 150  -- Muito bom
            WHEN v_total_consertos_relacionados = 2 THEN 100  -- Bom
            WHEN v_total_consertos_relacionados = 3 THEN 50   -- Regular
            ELSE 0  -- Ruim (4+ consertos)
        END;
    ELSE
        -- Sem atividade: neutro (não ganha nem perde pontos de cuidado)
        v_score_cuidado := 0;
    END IF;
    
    -- ========================================================================
    -- 4. PENALIDADE ADICIONAL POR CONSERTOS EXCESSIVOS
    -- ========================================================================
    -- Consertos acima de 3 causam penalidade progressiva
    -- 4 consertos = -50
    -- 5 consertos = -100
    -- 6+ consertos = -150 (máximo)
    
    IF v_total_consertos_relacionados > 3 THEN
        v_penalidade_consertos := LEAST(150, (v_total_consertos_relacionados - 3) * 50);
    ELSE
        v_penalidade_consertos := 0;
    END IF;
    
    -- ========================================================================
    -- 5. BÔNUS POR VOLUME DE ATIVIDADE (se for responsável)
    -- ========================================================================
    -- Recompensa colaboradores ativos E responsáveis
    -- 50+ retiradas com 90%+ devolução = +100 pts
    -- 20+ retiradas com 80%+ devolução = +50 pts
    
    v_bonus_volume := 0;
    IF v_total_retiradas >= 50 AND v_taxa_devolucao >= 0.9 THEN
        v_bonus_volume := 100;  -- Veterano confiável
    ELSIF v_total_retiradas >= 20 AND v_taxa_devolucao >= 0.8 THEN
        v_bonus_volume := 50;   -- Intermediário confiável
    END IF;
    
    -- ========================================================================
    -- 6. CALCULAR SCORE FINAL
    -- ========================================================================
    -- Base: 500 pontos (neutro)
    -- + Responsabilidade (0 a 300)
    -- + Cuidado (0 a 200)
    -- - Penalidade consertos excessivos (0 a -150)
    -- + Bônus volume (0 a 100)
    -- = Score final (limitado entre 100 e 1000)
    
    v_score_bruto := 500 
                   + v_score_responsabilidade 
                   + v_score_cuidado 
                   - v_penalidade_consertos 
                   + v_bonus_volume;
    
    -- Limitar entre 100 (mínimo) e 1000 (máximo)
    v_score_final := GREATEST(100, LEAST(1000, v_score_bruto::INTEGER));
    
    -- ========================================================================
    -- 7. DETERMINAR NÍVEL (LEVEL)
    -- ========================================================================
    -- MASTER: 800-1000 (responsável, cuidadoso, ativo)
    -- PRO: 600-799 (boa taxa de devolução, poucos consertos)
    -- MEMBER: 400-599 (performance razoável)
    -- NEWBIE: 100-399 (baixa taxa ou muitos consertos)
    
    v_level := CASE
        WHEN v_score_final >= 800 THEN 'MASTER'
        WHEN v_score_final >= 600 THEN 'PRO'
        WHEN v_score_final >= 400 THEN 'MEMBER'
        ELSE 'NEWBIE'
    END;
    
    RETURN QUERY SELECT v_score_final, v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.calculate_almox_score IS 
'Calcula Almox Score combinando responsabilidade (taxa de devolução) e cuidado (sem consertos).
Sistema de 1000 pontos:
- Base: 500 pts
- Responsabilidade: até +300 pts (100% devolução)
- Cuidado: até +200 pts (0 consertos)
- Penalidade: até -150 pts (consertos excessivos)
- Bônus atividade: até +100 pts (veterano responsável)';

-- ============================================================================
-- RECALCULAR TODOS OS SCORES COM O NOVO ALGORITMO
-- ============================================================================

SELECT public.recalculate_all_almox_scores();
