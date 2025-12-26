-- ============================================
-- DIAGNÓSTICO: Problemas na Devolução de Ferramentas
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. VERIFICAR MOVIMENTAÇÕES PENDENTES (retiradas sem devolução)
-- Identifica colaboradores com ferramentas em custódia
SELECT 
    '1. ITEMS EM CUSTÓDIA POR COLABORADOR' as diagnostico,
    c.nome as colaborador,
    f.nome as ferramenta,
    f.id as ferramenta_id,
    m.quantidade,
    m.data as data_retirada,
    f.profile_id as ferramenta_owner,
    c.profile_id as colaborador_owner
FROM movimentacoes m
JOIN colaboradores c ON m.colaborador_id = c.id
JOIN ferramentas f ON m.ferramenta_id = f.id
WHERE m.tipo = 'retirada'
AND NOT EXISTS (
    SELECT 1 FROM movimentacoes d 
    WHERE d.colaborador_id = m.colaborador_id 
    AND d.ferramenta_id = m.ferramenta_id
    AND d.tipo = 'devolucao'
    AND d.data >= m.data
)
ORDER BY c.nome, m.data DESC;

-- 2. VERIFICAR INCONSISTÊNCIA DE PROFILE_ID
-- Ferramentas com profile_id diferente do colaborador
SELECT 
    '2. INCONSISTÊNCIA DE PROFILE_ID' as diagnostico,
    c.nome as colaborador,
    c.profile_id as colaborador_profile_id,
    f.nome as ferramenta,
    f.profile_id as ferramenta_profile_id,
    CASE WHEN c.profile_id = f.profile_id THEN '✅ OK' ELSE '❌ DIFERENTE' END as status
FROM movimentacoes m
JOIN colaboradores c ON m.colaborador_id = c.id
JOIN ferramentas f ON m.ferramenta_id = f.id
WHERE c.profile_id != f.profile_id
LIMIT 20;

-- 3. MOVIMENTAÇÕES ÓRFÃS (ferramenta não existe mais)
SELECT 
    '3. MOVIMENTAÇÕES COM FERRAMENTA INEXISTENTE' as diagnostico,
    m.id as movimentacao_id,
    m.ferramenta_id,
    m.colaborador_id,
    m.tipo,
    m.data,
    c.nome as colaborador_nome
FROM movimentacoes m
LEFT JOIN ferramentas f ON m.ferramenta_id = f.id
LEFT JOIN colaboradores c ON m.colaborador_id = c.id
WHERE f.id IS NULL
LIMIT 20;

-- 4. VERIFICAR ESTOQUE INCONSISTENTE
-- Ferramentas onde quantidade_disponivel é maior que quantidade_total
SELECT 
    '4. ESTOQUE INCONSISTENTE' as diagnostico,
    f.nome,
    f.id,
    f.quantidade_total,
    f.quantidade_disponivel,
    f.quantidade_disponivel - f.quantidade_total as diferenca
FROM ferramentas f
WHERE f.quantidade_disponivel > f.quantidade_total;

-- 5. VERIFICAR ESTOQUE NEGATIVO
SELECT 
    '5. ESTOQUE NEGATIVO' as diagnostico,
    f.nome,
    f.id,
    f.quantidade_total,
    f.quantidade_disponivel
FROM ferramentas f
WHERE f.quantidade_disponivel < 0;

-- 6. SALDO CALCULADO vs QUANTIDADE DISPONÍVEL
-- Compara o saldo calculado pelas movimentações com a quantidade_disponivel atual
SELECT 
    '6. SALDO CALCULADO vs ESTOQUE' as diagnostico,
    calc.nome,
    calc.id,
    calc.quantidade_total,
    calc.estoque_atual,
    calc.estoque_calculado,
    calc.estoque_atual - calc.estoque_calculado as diferenca
FROM (
    SELECT 
        f.nome,
        f.id,
        f.quantidade_total,
        f.quantidade_disponivel as estoque_atual,
        f.quantidade_total - COALESCE(
            (SELECT SUM(CASE WHEN m.tipo = 'retirada' THEN m.quantidade ELSE -m.quantidade END)
             FROM movimentacoes m 
             WHERE m.ferramenta_id = f.id 
             AND m.tipo IN ('retirada', 'devolucao')), 0
        ) as estoque_calculado
    FROM ferramentas f
    WHERE f.tipo_item = 'ferramenta'
) calc
WHERE ABS(calc.estoque_atual - calc.estoque_calculado) > 0
ORDER BY diferenca DESC
LIMIT 20;

-- 7. VERIFICAR RLS - Listar todas as policies ativas
SELECT 
    '7. RLS POLICIES' as diagnostico,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('ferramentas', 'movimentacoes', 'colaboradores')
ORDER BY tablename, policyname;

-- 8. RESUMO DE PROFILE_IDS
-- Quantos registros cada profile_id tem
SELECT 
    '8. RESUMO POR PROFILE_ID' as diagnostico,
    profile_id,
    COUNT(*) as total_ferramentas,
    SUM(quantidade_total) as qtd_total,
    SUM(quantidade_disponivel) as qtd_disponivel
FROM ferramentas
GROUP BY profile_id
ORDER BY total_ferramentas DESC;
