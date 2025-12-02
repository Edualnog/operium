-- Script de Verificação Completa da Estrutura do Banco de Dados
-- Execute no SQL Editor do Supabase para verificar se tudo está correto

DO $$
DECLARE
    coluna_existe BOOLEAN;
    tabela_existe BOOLEAN;
    total_erros INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO DA ESTRUTURA DO BANCO DE DADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Verificar tabelas principais
    RAISE NOTICE '1. VERIFICANDO TABELAS PRINCIPAIS';
    RAISE NOTICE '-----------------------------------';
    
    -- Tabela profiles
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
    INTO tabela_existe;
    IF tabela_existe THEN
        RAISE NOTICE '✅ Tabela "profiles" existe';
    ELSE
        RAISE NOTICE '❌ Tabela "profiles" NÃO existe';
        total_erros := total_erros + 1;
    END IF;

    -- Tabela colaboradores
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'colaboradores')
    INTO tabela_existe;
    IF tabela_existe THEN
        RAISE NOTICE '✅ Tabela "colaboradores" existe';
    ELSE
        RAISE NOTICE '❌ Tabela "colaboradores" NÃO existe';
        total_erros := total_erros + 1;
    END IF;

    -- Tabela ferramentas
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ferramentas')
    INTO tabela_existe;
    IF tabela_existe THEN
        RAISE NOTICE '✅ Tabela "ferramentas" existe';
    ELSE
        RAISE NOTICE '❌ Tabela "ferramentas" NÃO existe';
        total_erros := total_erros + 1;
    END IF;

    -- Tabela movimentacoes
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movimentacoes')
    INTO tabela_existe;
    IF tabela_existe THEN
        RAISE NOTICE '✅ Tabela "movimentacoes" existe';
    ELSE
        RAISE NOTICE '❌ Tabela "movimentacoes" NÃO existe';
        total_erros := total_erros + 1;
    END IF;

    -- Tabela consertos
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consertos')
    INTO tabela_existe;
    IF tabela_existe THEN
        RAISE NOTICE '✅ Tabela "consertos" existe';
    ELSE
        RAISE NOTICE '❌ Tabela "consertos" NÃO existe';
        total_erros := total_erros + 1;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '2. VERIFICANDO COLUNAS DA TABELA MOVIMENTACOES';
    RAISE NOTICE '-----------------------------------------------';
    
    -- Colunas básicas
    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'id'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.id';
        ELSE
            RAISE NOTICE '❌ movimentacoes.id NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'profile_id'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.profile_id';
        ELSE
            RAISE NOTICE '❌ movimentacoes.profile_id NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'ferramenta_id'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.ferramenta_id';
        ELSE
            RAISE NOTICE '❌ movimentacoes.ferramenta_id NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'colaborador_id'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.colaborador_id';
        ELSE
            RAISE NOTICE '❌ movimentacoes.colaborador_id NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'tipo'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.tipo';
        ELSE
            RAISE NOTICE '❌ movimentacoes.tipo NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'quantidade'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.quantidade';
        ELSE
            RAISE NOTICE '❌ movimentacoes.quantidade NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'data'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.data';
        ELSE
            RAISE NOTICE '❌ movimentacoes.data NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    -- Colunas novas (opcionais - para KPIs avançados)
    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'prazo_devolucao'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.prazo_devolucao (OPCIONAL - para KPIs avançados)';
        ELSE
            RAISE NOTICE '⚠️  movimentacoes.prazo_devolucao NÃO existe (opcional)';
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'saida_at'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.saida_at (OPCIONAL - para KPIs avançados)';
        ELSE
            RAISE NOTICE '⚠️  movimentacoes.saida_at NÃO existe (opcional)';
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes' 
            AND column_name = 'devolucao_at'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ movimentacoes.devolucao_at (OPCIONAL - para KPIs avançados)';
        ELSE
            RAISE NOTICE '⚠️  movimentacoes.devolucao_at NÃO existe (opcional)';
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '3. VERIFICANDO COLUNAS DA TABELA FERRAMENTAS';
    RAISE NOTICE '--------------------------------------------';
    
    -- Colunas básicas
    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'id'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.id';
        ELSE
            RAISE NOTICE '❌ ferramentas.id NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'profile_id'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.profile_id';
        ELSE
            RAISE NOTICE '❌ ferramentas.profile_id NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'nome'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.nome';
        ELSE
            RAISE NOTICE '❌ ferramentas.nome NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'categoria'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.categoria';
        ELSE
            RAISE NOTICE '❌ ferramentas.categoria NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'quantidade_total'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.quantidade_total';
        ELSE
            RAISE NOTICE '❌ ferramentas.quantidade_total NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'quantidade_disponivel'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.quantidade_disponivel';
        ELSE
            RAISE NOTICE '❌ ferramentas.quantidade_disponivel NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'estado'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.estado';
        ELSE
            RAISE NOTICE '❌ ferramentas.estado NÃO existe';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    -- Colunas novas (opcionais - para KPIs avançados)
    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'tipo_item'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.tipo_item (OPCIONAL - para KPIs avançados)';
        ELSE
            RAISE NOTICE '⚠️  ferramentas.tipo_item NÃO existe (opcional)';
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'ponto_ressuprimento'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.ponto_ressuprimento (OPCIONAL - para KPIs avançados)';
        ELSE
            RAISE NOTICE '⚠️  ferramentas.ponto_ressuprimento NÃO existe (opcional)';
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'lead_time_dias'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.lead_time_dias (OPCIONAL - para KPIs avançados)';
        ELSE
            RAISE NOTICE '⚠️  ferramentas.lead_time_dias NÃO existe (opcional)';
        END IF;
    END LOOP;

    FOR coluna_existe IN 
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas' 
            AND column_name = 'validade'
        )
    LOOP
        IF coluna_existe THEN
            RAISE NOTICE '✅ ferramentas.validade (OPCIONAL - para KPIs avançados)';
        ELSE
            RAISE NOTICE '⚠️  ferramentas.validade NÃO existe (opcional)';
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '4. VERIFICANDO ROW LEVEL SECURITY (RLS)';
    RAISE NOTICE '----------------------------------------';
    
    -- Verificar RLS nas tabelas
    FOR tabela_existe IN 
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'profiles' 
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        IF tabela_existe THEN
            RAISE NOTICE '✅ RLS ativado em "profiles"';
        ELSE
            RAISE NOTICE '❌ RLS NÃO ativado em "profiles"';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR tabela_existe IN 
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'colaboradores' 
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        IF tabela_existe THEN
            RAISE NOTICE '✅ RLS ativado em "colaboradores"';
        ELSE
            RAISE NOTICE '❌ RLS NÃO ativado em "colaboradores"';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR tabela_existe IN 
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'ferramentas' 
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        IF tabela_existe THEN
            RAISE NOTICE '✅ RLS ativado em "ferramentas"';
        ELSE
            RAISE NOTICE '❌ RLS NÃO ativado em "ferramentas"';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    FOR tabela_existe IN 
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'movimentacoes' 
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        IF tabela_existe THEN
            RAISE NOTICE '✅ RLS ativado em "movimentacoes"';
        ELSE
            RAISE NOTICE '❌ RLS NÃO ativado em "movimentacoes"';
            total_erros := total_erros + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMO';
    RAISE NOTICE '========================================';
    
    IF total_erros = 0 THEN
        RAISE NOTICE '✅ BANCO DE DADOS ESTÁ CORRETO!';
        RAISE NOTICE 'Todas as estruturas essenciais estão presentes.';
        RAISE NOTICE '';
        RAISE NOTICE 'Nota: Campos marcados como "OPCIONAL" são para KPIs avançados.';
        RAISE NOTICE 'O dashboard funcionará mesmo sem eles, mas com funcionalidades limitadas.';
    ELSE
        RAISE NOTICE '❌ ENCONTRADOS % ERROS CRÍTICOS', total_erros;
        RAISE NOTICE 'Execute as migrations 001_initial_schema.sql e 002_add_indexes.sql';
    END IF;
    
    RAISE NOTICE '';
END $$;

