-- ============================================================================
-- Script para corrigir ferramentas "Em Conserto" sem registro de conserto
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- PASSO 1: Identificar ferramentas com problema (estado em_conserto sem entrada na tabela consertos)
SELECT 
    f.id AS ferramenta_id,
    f.nome,
    f.estado,
    f.quantidade_total,
    f.quantidade_disponivel,
    f.profile_id,
    COALESCE(c.consertos_count, 0) AS consertos_ativos
FROM ferramentas f
LEFT JOIN (
    SELECT ferramenta_id, COUNT(*) AS consertos_count 
    FROM consertos 
    WHERE status != 'concluido'
    GROUP BY ferramenta_id
) c ON c.ferramenta_id = f.id
WHERE f.estado = 'em_conserto'
  AND COALESCE(c.consertos_count, 0) = 0;

-- ============================================================================
-- PASSO 2: OPÇÃO A - Criar registros de conserto para cada ferramenta órfã
-- ============================================================================
-- Descomente e execute se quiser manter como "em conserto" e criar os registros

/*
INSERT INTO consertos (profile_id, ferramenta_id, descricao, status, local_conserto, prioridade)
SELECT 
    f.profile_id,
    f.id,
    '[FALHA: Recuperado automaticamente] Ferramenta estava marcada como em conserto sem registro correspondente',
    'aguardando',
    'Interno (Triagem)',
    'media'
FROM ferramentas f
LEFT JOIN (
    SELECT ferramenta_id, COUNT(*) AS consertos_count 
    FROM consertos 
    WHERE status != 'concluido'
    GROUP BY ferramenta_id
) c ON c.ferramenta_id = f.id
WHERE f.estado = 'em_conserto'
  AND COALESCE(c.consertos_count, 0) = 0;
*/

-- ============================================================================
-- PASSO 2: OPÇÃO B - Restaurar estado para "ok" e devolver ao estoque
-- Descomente e execute se quiser reverter o estado (mais simples)
-- ============================================================================

/*
UPDATE ferramentas
SET 
    estado = 'ok',
    quantidade_disponivel = quantidade_total
WHERE id IN (
    SELECT f.id
    FROM ferramentas f
    LEFT JOIN (
        SELECT ferramenta_id, COUNT(*) AS consertos_count 
        FROM consertos 
        WHERE status != 'concluido'
        GROUP BY ferramenta_id
    ) c ON c.ferramenta_id = f.id
    WHERE f.estado = 'em_conserto'
      AND COALESCE(c.consertos_count, 0) = 0
);
*/

-- ============================================================================
-- APÓS ESCOLHER E EXECUTAR UMA DAS OPÇÕES ACIMA, VERIFIQUE O RESULTADO:
-- ============================================================================
SELECT 
    f.id,
    f.nome,
    f.estado,
    f.quantidade_disponivel,
    f.quantidade_total
FROM ferramentas f
WHERE f.estado = 'em_conserto';
