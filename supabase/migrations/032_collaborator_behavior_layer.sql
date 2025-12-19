-- Migration: 032_collaborator_behavior_layer.sql
-- Description: Cria tabelas e funções para coleta de dados comportamentais de colaboradores
-- Context: Camada de dados operacionais LGPD-safe para inteligência futura (benchmarks, M&A, B2B)
-- Depends on: 027_add_industry_segment.sql, 030_onboarding_immutable_fields.sql

-- ============================================================================
-- 1. TABELA: PERFIL OPERACIONAL DO COLABORADOR
-- ============================================================================
-- Armazena dados operacionais obrigatórios para cada colaborador

CREATE TABLE IF NOT EXISTS public.collaborator_operational_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    role_function TEXT NOT NULL,
    seniority_bucket TEXT NOT NULL CHECK (
        seniority_bucket IN (
            'LESS_THAN_6_MONTHS',
            '6_TO_24_MONTHS',
            'MORE_THAN_24_MONTHS'
        )
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (collaborator_id)
);

COMMENT ON TABLE public.collaborator_operational_profile IS 'Perfil operacional do colaborador para inteligência de comportamento.';
COMMENT ON COLUMN public.collaborator_operational_profile.role_function IS 'Função operacional: Operador, Eletricista, Mecânico, etc.';
COMMENT ON COLUMN public.collaborator_operational_profile.seniority_bucket IS 'Faixa de tempo na função atual (sem idade direta).';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cop_collaborator_id ON public.collaborator_operational_profile(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_cop_role_function ON public.collaborator_operational_profile(role_function);
CREATE INDEX IF NOT EXISTS idx_cop_seniority ON public.collaborator_operational_profile(seniority_bucket);


-- ============================================================================
-- 2. TABELA: FEATURES COMPORTAMENTAIS (BLACKBOX)
-- ============================================================================
-- Scores calculados automaticamente. NÃO podem ser editados via UI/API pública.

CREATE TABLE IF NOT EXISTS public.collaborator_behavior_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    
    -- Scores Normalizados (0-100 ou 0-1)
    responsibility_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    risk_exposure_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    process_adherence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    incident_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    
    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculation_version INTEGER DEFAULT 1,
    
    UNIQUE (collaborator_id)
);

COMMENT ON TABLE public.collaborator_behavior_features IS 'Features comportamentais derivadas (Blackbox). Apenas atualizável por funções internas.';
COMMENT ON COLUMN public.collaborator_behavior_features.responsibility_score IS 'Score de responsabilidade baseado em devoluções no prazo.';
COMMENT ON COLUMN public.collaborator_behavior_features.risk_exposure_score IS 'Score de exposição a risco baseado em incidentes relacionados.';
COMMENT ON COLUMN public.collaborator_behavior_features.process_adherence_score IS 'Score de aderência a processos (termos assinados, etc).';
COMMENT ON COLUMN public.collaborator_behavior_features.incident_rate IS 'Taxa de incidentes normalizados por operação.';

-- Índice para busca
CREATE INDEX IF NOT EXISTS idx_cbf_collaborator_id ON public.collaborator_behavior_features(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_cbf_calculated_at ON public.collaborator_behavior_features(calculated_at);


-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

-- RLS para collaborator_operational_profile (mesmo padrão de colaboradores)
ALTER TABLE public.collaborator_operational_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can view own collaborator profiles"
    ON public.collaborator_operational_profile FOR SELECT
    USING (
        collaborator_id IN (
            SELECT id FROM public.colaboradores WHERE profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can insert own collaborator profiles"
    ON public.collaborator_operational_profile FOR INSERT
    WITH CHECK (
        collaborator_id IN (
            SELECT id FROM public.colaboradores WHERE profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can update own collaborator profiles"
    ON public.collaborator_operational_profile FOR UPDATE
    USING (
        collaborator_id IN (
            SELECT id FROM public.colaboradores WHERE profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own collaborator profiles" ON public.collaborator_operational_profile;
CREATE POLICY "Users can delete own collaborator profiles"
    ON public.collaborator_operational_profile FOR DELETE
    USING (
        collaborator_id IN (
            SELECT id FROM public.colaboradores WHERE profile_id = auth.uid()
        )
    );  

-- RLS para collaborator_behavior_features (APENAS LEITURA pelo owner - scores são blackbox)
ALTER TABLE public.collaborator_behavior_features ENABLE ROW LEVEL SECURITY;

-- Usuários NÃO podem ver seus próprios scores individuais (blackbox)
-- Apenas agregados via views são permitidos
DROP POLICY IF EXISTS "Block direct access to behavior features" ON public.collaborator_behavior_features;
CREATE POLICY "Block direct access to behavior features"
    ON public.collaborator_behavior_features FOR SELECT
    USING (false); -- Bloqueia SELECT direto

-- Apenas service_role pode manipular (via funções SECURITY DEFINER)
DROP POLICY IF EXISTS "Service role full access" ON public.collaborator_behavior_features;
CREATE POLICY "Service role full access"
    ON public.collaborator_behavior_features FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');


-- ============================================================================
-- 4. TRIGGER: PROTEÇÃO CONTRA EDIÇÃO MANUAL DE SCORES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_behavior_features()
RETURNS TRIGGER AS $$
BEGIN
    -- Permite apenas se chamado por SECURITY DEFINER function ou service_role
    IF current_setting('request.jwt.claims', true)::json ->> 'role' != 'service_role' THEN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'Scores comportamentais não podem ser editados manualmente';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_behavior_features_trigger ON public.collaborator_behavior_features;
CREATE TRIGGER protect_behavior_features_trigger
    BEFORE INSERT OR UPDATE ON public.collaborator_behavior_features
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_behavior_features();


-- ============================================================================
-- 5. FUNÇÃO: CÁLCULO DE SCORES (ALTO NÍVEL)
-- ============================================================================
-- Esta função agrega eventos existentes e calcula scores relativos

CREATE OR REPLACE FUNCTION analytics.calculate_collaborator_scores()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Upsert scores baseados em dados existentes
    INSERT INTO public.collaborator_behavior_features (
        collaborator_id,
        responsibility_score,
        risk_exposure_score,
        process_adherence_score,
        incident_rate,
        calculated_at,
        calculation_version
    )
    SELECT
        c.id AS collaborator_id,
        
        -- RESPONSIBILITY SCORE: Baseado em long_retention_rate (inverso)
        COALESCE(
            (1 - COALESCE(cb.long_retention_rate, 0)) * 100, 
            50 -- Default para colaboradores sem histórico
        )::NUMERIC(5,2) AS responsibility_score,
        
        -- RISK EXPOSURE: Baseado em volume de operações e consertos relacionados
        COALESCE(
            CASE 
                WHEN cb.total_operations > 0 THEN
                    LEAST(100, (consertos_count.cnt::NUMERIC / cb.total_operations) * 100)
                ELSE 0
            END,
            0
        )::NUMERIC(5,2) AS risk_exposure_score,
        
        -- PROCESS ADHERENCE: Baseado em termos assinados vs operações
        COALESCE(
            CASE 
                WHEN cb.total_operations > 0 THEN
                    LEAST(100, (termos_count.cnt::NUMERIC / cb.total_operations) * 100)
                ELSE 50 -- Default neutro
            END,
            50
        )::NUMERIC(5,2) AS process_adherence_score,
        
        -- INCIDENT RATE: Ajustes de inventário relacionados / total operações
        COALESCE(
            CASE 
                WHEN cb.total_operations > 0 THEN
                    (divergence_count.cnt::NUMERIC / cb.total_operations)
                ELSE 0
            END,
            0
        )::NUMERIC(5,4) AS incident_rate,
        
        NOW() AS calculated_at,
        1 AS calculation_version
        
    FROM public.colaboradores c
    LEFT JOIN analytics.collaborator_behavior cb ON c.id = cb.colaborador_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt 
        FROM public.consertos con
        JOIN public.movimentacoes m ON m.ferramenta_id = con.ferramenta_id
        WHERE m.colaborador_id = c.id
    ) consertos_count ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt 
        FROM public.termos_responsabilidade t
        WHERE t.colaborador_id = c.id
    ) termos_count ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt 
        FROM analytics.events_log e
        WHERE e.actor_id = c.id AND e.signal_type = 'DIVERGENCE'
    ) divergence_count ON true
    
    ON CONFLICT (collaborator_id) DO UPDATE SET
        responsibility_score = EXCLUDED.responsibility_score,
        risk_exposure_score = EXCLUDED.risk_exposure_score,
        process_adherence_score = EXCLUDED.process_adherence_score,
        incident_rate = EXCLUDED.incident_rate,
        calculated_at = NOW(),
        calculation_version = collaborator_behavior_features.calculation_version + 1;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION analytics.calculate_collaborator_scores IS 'Recalcula scores comportamentais para todos os colaboradores. Executar via job agendado.';


-- ============================================================================
-- 6. VIEW: AGREGADOS ANÔNIMOS PARA INTELIGÊNCIA
-- ============================================================================

CREATE OR REPLACE VIEW analytics.collaborator_behavior_aggregates AS
SELECT
    p.industry_segment,
    p.company_size,
    cop.role_function,
    cop.seniority_bucket,
    
    -- Métricas agregadas (sem identificadores pessoais)
    COUNT(*) AS sample_size,
    AVG(cbf.responsibility_score)::NUMERIC(5,2) AS avg_responsibility,
    AVG(cbf.risk_exposure_score)::NUMERIC(5,2) AS avg_risk,
    AVG(cbf.process_adherence_score)::NUMERIC(5,2) AS avg_adherence,
    AVG(cbf.incident_rate)::NUMERIC(5,4) AS avg_incident_rate,
    
    -- Percentis para benchmarking
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cbf.responsibility_score)::NUMERIC(5,2) AS median_responsibility,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY cbf.responsibility_score)::NUMERIC(5,2) AS p90_responsibility

FROM public.collaborator_behavior_features cbf
JOIN public.colaboradores c ON c.id = cbf.collaborator_id
JOIN public.profiles p ON p.id = c.profile_id
LEFT JOIN public.collaborator_operational_profile cop ON cop.collaborator_id = c.id
WHERE 
    p.industry_segment IS NOT NULL 
    AND p.company_size IS NOT NULL
GROUP BY 
    p.industry_segment, 
    p.company_size, 
    cop.role_function, 
    cop.seniority_bucket
HAVING COUNT(*) >= 5; -- Mínimo de 5 para anonimato

COMMENT ON VIEW analytics.collaborator_behavior_aggregates IS 'Agregados comportamentais anônimos para benchmarking setorial. Sem identificadores pessoais.';

-- Acesso apenas para authenticated (dados agregados)
GRANT SELECT ON analytics.collaborator_behavior_aggregates TO authenticated;


-- ============================================================================
-- 7. GRANT FINAL  
-- ============================================================================

GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT SELECT ON public.collaborator_operational_profile TO authenticated;
-- collaborator_behavior_features: SEM grant direto (RLS bloqueia)
