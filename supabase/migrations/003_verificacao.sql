-- Script de Verificação do Supabase
-- Execute este script no SQL Editor do Supabase para verificar se tudo está configurado corretamente

-- ============================================
-- 1. VERIFICAR TABELAS
-- ============================================
DO $$
DECLARE
    tabelas_esperadas TEXT[] := ARRAY['profiles', 'colaboradores', 'ferramentas', 'movimentacoes', 'consertos'];
    tabela TEXT;
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DE TABELAS ===';
    FOREACH tabela IN ARRAY tabelas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tabela
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '✅ Tabela "%" existe', tabela;
        ELSE
            RAISE NOTICE '❌ Tabela "%" NÃO existe', tabela;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 2. VERIFICAR ROW LEVEL SECURITY (RLS)
-- ============================================
DO $$
DECLARE
    tabelas TEXT[] := ARRAY['profiles', 'colaboradores', 'ferramentas', 'movimentacoes', 'consertos'];
    tabela TEXT;
    rls_habilitado BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICAÇÃO DE RLS ===';
    FOREACH tabela IN ARRAY tabelas
    LOOP
        SELECT relrowsecurity INTO rls_habilitado
        FROM pg_class
        WHERE relname = tabela;
        
        IF rls_habilitado THEN
            RAISE NOTICE '✅ RLS habilitado na tabela "%"', tabela;
        ELSE
            RAISE NOTICE '❌ RLS NÃO habilitado na tabela "%"', tabela;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 3. VERIFICAR POLÍTICAS RLS
-- ============================================
DO $$
DECLARE
    politicas_esperadas TEXT[] := ARRAY[
        'Users can view own profile',
        'Users can update own profile',
        'Users can insert own profile',
        'Users can view own colaboradores',
        'Users can insert own colaboradores',
        'Users can update own colaboradores',
        'Users can delete own colaboradores',
        'Users can view own ferramentas',
        'Users can insert own ferramentas',
        'Users can update own ferramentas',
        'Users can delete own ferramentas',
        'Users can view own movimentacoes',
        'Users can insert own movimentacoes',
        'Users can update own movimentacoes',
        'Users can delete own movimentacoes',
        'Users can view own consertos',
        'Users can insert own consertos',
        'Users can update own consertos',
        'Users can delete own consertos'
    ];
    politica TEXT;
    existe BOOLEAN;
    total_encontradas INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICAÇÃO DE POLÍTICAS RLS ===';
    FOREACH politica IN ARRAY politicas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_policies 
            WHERE policyname = politica
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '✅ Política "%" existe', politica;
            total_encontradas := total_encontradas + 1;
        ELSE
            RAISE NOTICE '❌ Política "%" NÃO existe', politica;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total: %/% políticas encontradas', total_encontradas, array_length(politicas_esperadas, 1);
END $$;

-- ============================================
-- 4. VERIFICAR FUNÇÃO handle_new_user
-- ============================================
DO $$
DECLARE
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICAÇÃO DE FUNÇÕES ===';
    
    SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'handle_new_user'
    ) INTO existe;
    
    IF existe THEN
        RAISE NOTICE '✅ Função "handle_new_user" existe';
    ELSE
        RAISE NOTICE '❌ Função "handle_new_user" NÃO existe';
    END IF;
END $$;

-- ============================================
-- 5. VERIFICAR TRIGGER on_auth_user_created
-- ============================================
DO $$
DECLARE
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICAÇÃO DE TRIGGERS ===';
    
    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) INTO existe;
    
    IF existe THEN
        RAISE NOTICE '✅ Trigger "on_auth_user_created" existe';
    ELSE
        RAISE NOTICE '❌ Trigger "on_auth_user_created" NÃO existe';
    END IF;
END $$;

-- ============================================
-- 6. VERIFICAR ÍNDICES
-- ============================================
DO $$
DECLARE
    indices_esperados TEXT[] := ARRAY[
        'idx_colaboradores_profile_id',
        'idx_ferramentas_profile_id',
        'idx_movimentacoes_profile_id',
        'idx_consertos_profile_id',
        'idx_ferramentas_estado',
        'idx_movimentacoes_tipo',
        'idx_movimentacoes_data',
        'idx_consertos_status',
        'idx_movimentacoes_profile_tipo_data',
        'idx_ferramentas_profile_estado',
        'idx_movimentacoes_ferramenta_id',
        'idx_movimentacoes_colaborador_id',
        'idx_consertos_ferramenta_id'
    ];
    indice TEXT;
    existe BOOLEAN;
    total_encontrados INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICAÇÃO DE ÍNDICES ===';
    FOREACH indice IN ARRAY indices_esperados
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = indice
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '✅ Índice "%" existe', indice;
            total_encontrados := total_encontrados + 1;
        ELSE
            RAISE NOTICE '❌ Índice "%" NÃO existe', indice;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total: %/% índices encontrados', total_encontrados, array_length(indices_esperados, 1);
END $$;

-- ============================================
-- 7. VERIFICAR EXTENSÃO uuid-ossp
-- ============================================
DO $$
DECLARE
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICAÇÃO DE EXTENSÕES ===';
    
    SELECT EXISTS (
        SELECT FROM pg_extension 
        WHERE extname = 'uuid-ossp'
    ) INTO existe;
    
    IF existe THEN
        RAISE NOTICE '✅ Extensão "uuid-ossp" está habilitada';
    ELSE
        RAISE NOTICE '❌ Extensão "uuid-ossp" NÃO está habilitada';
    END IF;
END $$;

-- ============================================
-- 8. VERIFICAR ESTRUTURA DAS TABELAS
-- ============================================
DO $$
DECLARE
    tabela TEXT;
    coluna TEXT;
    colunas_esperadas TEXT[];
    existe BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICAÇÃO DE COLUNAS ===';
    
    -- Verificar tabela profiles
    RAISE NOTICE 'Tabela: profiles';
    colunas_esperadas := ARRAY['id', 'name', 'created_at'];
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles'
            AND column_name = coluna
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '  ✅ Coluna "%" existe', coluna;
        ELSE
            RAISE NOTICE '  ❌ Coluna "%" NÃO existe', coluna;
        END IF;
    END LOOP;
    
    -- Verificar tabela colaboradores
    RAISE NOTICE 'Tabela: colaboradores';
    colunas_esperadas := ARRAY['id', 'profile_id', 'nome', 'cargo', 'telefone', 'created_at'];
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'colaboradores'
            AND column_name = coluna
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '  ✅ Coluna "%" existe', coluna;
        ELSE
            RAISE NOTICE '  ❌ Coluna "%" NÃO existe', coluna;
        END IF;
    END LOOP;
    
    -- Verificar tabela ferramentas
    RAISE NOTICE 'Tabela: ferramentas';
    colunas_esperadas := ARRAY['id', 'profile_id', 'nome', 'categoria', 'quantidade_total', 'quantidade_disponivel', 'estado', 'created_at'];
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'ferramentas'
            AND column_name = coluna
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '  ✅ Coluna "%" existe', coluna;
        ELSE
            RAISE NOTICE '  ❌ Coluna "%" NÃO existe', coluna;
        END IF;
    END LOOP;
    
    -- Verificar tabela movimentacoes
    RAISE NOTICE 'Tabela: movimentacoes';
    colunas_esperadas := ARRAY['id', 'profile_id', 'ferramenta_id', 'colaborador_id', 'tipo', 'quantidade', 'observacoes', 'data'];
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes'
            AND column_name = coluna
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '  ✅ Coluna "%" existe', coluna;
        ELSE
            RAISE NOTICE '  ❌ Coluna "%" NÃO existe', coluna;
        END IF;
    END LOOP;
    
    -- Verificar tabela consertos
    RAISE NOTICE 'Tabela: consertos';
    colunas_esperadas := ARRAY['id', 'profile_id', 'ferramenta_id', 'descricao', 'status', 'custo', 'data_envio', 'data_retorno'];
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'consertos'
            AND column_name = coluna
        ) INTO existe;
        
        IF existe THEN
            RAISE NOTICE '  ✅ Coluna "%" existe', coluna;
        ELSE
            RAISE NOTICE '  ❌ Coluna "%" NÃO existe', coluna;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- RESUMO FINAL
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO CONCLUÍDA!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Revise os resultados acima.';
    RAISE NOTICE 'Se houver algum ❌, execute as migrations correspondentes.';
    RAISE NOTICE '';
    RAISE NOTICE 'Migrations disponíveis:';
    RAISE NOTICE '  1. 001_initial_schema.sql - Schema inicial';
    RAISE NOTICE '  2. 002_add_indexes.sql - Índices de performance';
    RAISE NOTICE '';
END $$;

