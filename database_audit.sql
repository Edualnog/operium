-- ============================================================================
-- AUDITORIA COMPLETA DE CONSISTÊNCIA DO BANCO DE DADOS
-- Execute cada seção separadamente no SQL Editor do Supabase
-- ============================================================================

-- ============================================================================
-- 1. FERRAMENTAS COM QUANTIDADE INCONSISTENTE
-- (quantidade_disponivel > quantidade_total)
-- ============================================================================
SELECT 
    id,
    nome,
    quantidade_total,
    quantidade_disponivel,
    estado,
    'ERRO: disponivel > total' AS problema
FROM ferramentas
WHERE quantidade_disponivel > quantidade_total;

-- ============================================================================
-- 2. FERRAMENTAS EM CONSERTO SEM REGISTRO DE CONSERTO ATIVO
-- ============================================================================
SELECT 
    f.id,
    f.nome,
    f.estado,
    f.quantidade_disponivel,
    f.quantidade_total,
    'ERRO: estado em_conserto sem conserto ativo' AS problema
FROM ferramentas f
LEFT JOIN consertos c ON c.ferramenta_id = f.id AND c.status != 'concluido'
WHERE f.estado = 'em_conserto'
  AND c.id IS NULL;

-- ============================================================================
-- 3. CONSERTOS NÃO-CONCLUÍDOS COM FERRAMENTA EM ESTADO OK
-- ============================================================================
SELECT 
    c.id AS conserto_id,
    c.status AS conserto_status,
    f.id AS ferramenta_id,
    f.nome,
    f.estado AS ferramenta_estado,
    'AVISO: conserto ativo mas ferramenta ok' AS problema
FROM consertos c
JOIN ferramentas f ON f.id = c.ferramenta_id
WHERE c.status != 'concluido'
  AND f.estado = 'ok';

-- ============================================================================
-- 4. MOVIMENTAÇÕES ÓRFÃS (ferramenta inexistente)
-- ============================================================================
SELECT 
    m.id,
    m.tipo,
    m.ferramenta_id,
    m.quantidade,
    'ERRO: ferramenta inexistente' AS problema
FROM movimentacoes m
LEFT JOIN ferramentas f ON f.id = m.ferramenta_id
WHERE f.id IS NULL;

-- ============================================================================
-- 5. MOVIMENTAÇÕES ÓRFÃS (colaborador inexistente)
-- ============================================================================
SELECT 
    m.id,
    m.tipo,
    m.colaborador_id,
    m.quantidade,
    'ERRO: colaborador inexistente' AS problema
FROM movimentacoes m
LEFT JOIN colaboradores c ON c.id = m.colaborador_id
WHERE m.colaborador_id IS NOT NULL 
  AND c.id IS NULL;

-- ============================================================================
-- 6. TEAM_EQUIPMENT ÓRFÃOS (ferramenta inexistente)
-- ============================================================================
SELECT 
    te.id,
    te.team_id,
    te.ferramenta_id,
    te.status,
    'ERRO: ferramenta inexistente' AS problema
FROM team_equipment te
LEFT JOIN ferramentas f ON f.id = te.ferramenta_id
WHERE f.id IS NULL;

-- ============================================================================
-- 7. TEAM_EQUIPMENT ATIVO SEM DESCONTAR DO ESTOQUE
-- (ferramenta com estoque cheio mas tem equipamento alocado)
-- ============================================================================
SELECT 
    te.id AS team_equipment_id,
    t.name AS team_name,
    f.nome AS ferramenta_nome,
    te.quantity AS qty_alocada,
    f.quantidade_total,
    f.quantidade_disponivel,
    'AVISO: equipamento alocado mas estoque cheio' AS problema
FROM team_equipment te
JOIN teams t ON t.id = te.team_id
JOIN ferramentas f ON f.id = te.ferramenta_id
WHERE te.returned_at IS NULL
  AND te.status NOT IN ('returned', 'returned_with_issue')
  AND f.quantidade_disponivel = f.quantidade_total;

-- ============================================================================
-- 8. TEAMS SEM ORG_ID (pode causar problemas de RLS)
-- ============================================================================
SELECT 
    t.id,
    t.name,
    t.profile_id,
    t.org_id,
    'AVISO: team sem org_id' AS problema
FROM teams t
WHERE t.org_id IS NULL
  AND t.deleted_at IS NULL;

-- ============================================================================
-- 9. CONSERTOS COM PROFILE_ID DIFERENTE DA FERRAMENTA
-- (inconsistência de tenant)
-- ============================================================================
SELECT 
    c.id AS conserto_id,
    c.profile_id AS conserto_profile,
    f.id AS ferramenta_id,
    f.profile_id AS ferramenta_profile,
    f.nome,
    'ERRO: profile_id inconsistente' AS problema
FROM consertos c
JOIN ferramentas f ON f.id = c.ferramenta_id
WHERE c.profile_id != f.profile_id;

-- ============================================================================
-- 10. MOVIMENTAÇÕES COM PROFILE_ID DIFERENTE DA FERRAMENTA
-- ============================================================================
SELECT 
    m.id AS movimentacao_id,
    m.profile_id AS mov_profile,
    f.id AS ferramenta_id,
    f.profile_id AS fer_profile,
    f.nome,
    m.tipo,
    'ERRO: profile_id inconsistente' AS problema
FROM movimentacoes m
JOIN ferramentas f ON f.id = m.ferramenta_id
WHERE m.profile_id != f.profile_id;

-- ============================================================================
-- 11. RETIRADAS PENDENTES (sem devolução correspondente)
-- Colaboradores que retiraram itens e nunca devolveram
-- ============================================================================
WITH saldo_por_colaborador AS (
    SELECT 
        m.colaborador_id,
        m.ferramenta_id,
        SUM(CASE WHEN m.tipo = 'retirada' THEN m.quantidade ELSE 0 END) AS total_retirado,
        SUM(CASE WHEN m.tipo = 'devolucao' THEN m.quantidade ELSE 0 END) AS total_devolvido
    FROM movimentacoes m
    WHERE m.colaborador_id IS NOT NULL
    GROUP BY m.colaborador_id, m.ferramenta_id
)
SELECT 
    c.nome AS colaborador,
    f.nome AS ferramenta,
    s.total_retirado,
    s.total_devolvido,
    (s.total_retirado - s.total_devolvido) AS pendente,
    'INFO: itens pendentes de devolução' AS status
FROM saldo_por_colaborador s
JOIN colaboradores c ON c.id = s.colaborador_id
JOIN ferramentas f ON f.id = s.ferramenta_id
WHERE s.total_retirado > s.total_devolvido
ORDER BY pendente DESC;

-- ============================================================================
-- 12. RESUMO GERAL DE INCONSISTÊNCIAS
-- ============================================================================
SELECT 'Ferramentas com quantidade_disponivel > quantidade_total' AS tipo, COUNT(*) AS quantidade
FROM ferramentas WHERE quantidade_disponivel > quantidade_total
UNION ALL
SELECT 'Ferramentas em_conserto sem conserto ativo', COUNT(*)
FROM ferramentas f
LEFT JOIN consertos c ON c.ferramenta_id = f.id AND c.status != 'concluido'
WHERE f.estado = 'em_conserto' AND c.id IS NULL
UNION ALL
SELECT 'Consertos ativos com ferramenta em estado ok', COUNT(*)
FROM consertos c
JOIN ferramentas f ON f.id = c.ferramenta_id
WHERE c.status != 'concluido' AND f.estado = 'ok'
UNION ALL
SELECT 'Consertos com profile_id inconsistente', COUNT(*)
FROM consertos c
JOIN ferramentas f ON f.id = c.ferramenta_id
WHERE c.profile_id != f.profile_id
UNION ALL
SELECT 'Movimentações com profile_id inconsistente', COUNT(*)
FROM movimentacoes m
JOIN ferramentas f ON f.id = m.ferramenta_id
WHERE m.profile_id != f.profile_id
UNION ALL
SELECT 'Teams sem org_id', COUNT(*)
FROM teams WHERE org_id IS NULL AND deleted_at IS NULL;
