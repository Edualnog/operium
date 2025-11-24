-- Migration opcional para otimizar políticas RLS
-- Isso reduzirá os warnings do Performance Advisor

-- Criar função auxiliar para cache do auth.uid()
-- Isso melhora a performance das queries RLS
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Nota: As políticas RLS atuais já estão corretas e funcionais.
-- Esta migration é apenas uma otimização opcional.
-- Os warnings do Performance Advisor são sugestões, não erros críticos.

-- Se você quiser manter as políticas como estão (recomendado para começar),
-- pode ignorar esses warnings. Eles não afetam a funcionalidade do sistema.

