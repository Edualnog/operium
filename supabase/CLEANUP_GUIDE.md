# Guia de Limpeza de Telemetria Legada

## ⚠️ IMPORTANTE

Execute esta limpeza **APENAS DEPOIS** de validar que o sistema Cloudflare está funcionando corretamente.

---

## 📊 Tabelas Afetadas (Safe to Clean)

Estas tabelas armazenavam telemetria no Postgres e **não afetam** o funcionamento do produto:

### Telemetria (Safe)
- ✅ `domain_events` - Eventos de domínio
- ✅ `event_context` - Contexto adicional de eventos
- ✅ `observer_execution_log` - Logs de observers
- ✅ `observer_state` - Estado dos observers
- ✅ `metric_execution_log` - Logs de execução de métricas
- ✅ `derived_metrics` - Métricas derivadas
- ✅ `operational_alerts` - Alertas operacionais
- ✅ `operational_baselines` - Baselines de métricas
- ✅ `event_ingestion_errors` - Erros de ingestão

### Metadados (Safe)
- ✅ `event_type_catalog` - Catálogo de tipos
- ✅ `derived_event_types` - Tipos de eventos derivados
- ✅ `event_policy` - Políticas de eventos
- ✅ `metric_catalog` - Catálogo de métricas
- ✅ `event_ingestion_config` - Config de ingestão

---

## 🚫 Tabelas que NÃO Devem Ser Limpas

Estas tabelas **SÃO CRÍTICAS** para o produto:

- ❌ `ferramentas` - Cadastro de ferramentas
- ❌ `colaboradores` - Cadastro de colaboradores
- ❌ `movimentacoes` - Histórico de movimentações (CRÍTICO!)
- ❌ `consertos` - Histórico de consertos
- ❌ `vehicles` - Cadastro de veículos
- ❌ `teams` - Equipes
- ❌ `profiles` - Organizações/usuários

---

## 🎯 Opções de Limpeza

### Opção 1: Conservadora (Recomendado) ⭐

Remove apenas dados **> 90 dias**.

```sql
-- Ver volume atual
SELECT COUNT(*) FROM public.domain_events;

-- Deletar eventos antigos
DELETE FROM public.event_context
WHERE event_id IN (
    SELECT id FROM public.domain_events
    WHERE occurred_at < NOW() - INTERVAL '90 days'
);

DELETE FROM public.domain_events
WHERE occurred_at < NOW() - INTERVAL '90 days';
```

**Quando usar:**
- Primeira limpeza
- Quer manter dados recentes para análise

---

### Opção 2: Completa (Cuidado!) ⚠️

Remove **TODOS** os dados de telemetria.

```sql
TRUNCATE TABLE public.event_context CASCADE;
TRUNCATE TABLE public.domain_events CASCADE;
TRUNCATE TABLE public.observer_execution_log CASCADE;
TRUNCATE TABLE public.metric_execution_log CASCADE;
```

**Quando usar:**
- Sistema Cloudflare validado há mais de 1 mês
- Não precisa de dados históricos
- Quer recuperar máximo de espaço

---

### Opção 3: Arquivamento (Safe)

Move dados antigos para tabela de arquivo antes de deletar.

```sql
-- Criar arquivo
CREATE TABLE public.domain_events_archive (
    LIKE public.domain_events INCLUDING ALL
);

-- Mover
INSERT INTO public.domain_events_archive
SELECT * FROM public.domain_events
WHERE occurred_at < NOW() - INTERVAL '90 days';

-- Deletar original
DELETE FROM public.domain_events
WHERE occurred_at < NOW() - INTERVAL '90 days';
```

**Quando usar:**
- Quer backup antes de deletar
- Pode precisar dos dados futuramente
- Análise retrospectiva

---

### Opção 4: Apenas Desabilitar (Zero Risk)

Não deleta nada, apenas desabilita geração de novos eventos.

```sql
UPDATE public.event_ingestion_config
SET enable_triggers = false;
```

**Quando usar:**
- Acabou de migrar para Cloudflare
- Quer validar por mais tempo
- Não tem pressa para limpar

---

## 📐 Passo a Passo Recomendado

### 1. Verificar Volume Atual

```sql
-- Ver quantos eventos existem
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '30 days') as ultimos_30_dias,
    COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '90 days') as ultimos_90_dias,
    pg_size_pretty(pg_total_relation_size('public.domain_events')) as tamanho
FROM public.domain_events;
```

### 2. Fazer Backup (Opcional)

```bash
# Via Supabase CLI
supabase db dump --data-only -f backup_telemetria.sql \
  -t domain_events \
  -t event_context \
  -t observer_execution_log
```

### 3. Executar Migration

```bash
# Rodar migration
npx supabase db push --linked
```

**OU** executar manualmente no SQL Editor do Supabase.

### 4. Recuperar Espaço

```sql
-- Recuperar espaço no disco
VACUUM FULL public.domain_events;
VACUUM FULL public.event_context;
VACUUM FULL public.observer_execution_log;
```

⏱️ **Tempo:** 1-10 minutos dependendo do volume.

### 5. Verificar Resultado

```sql
SELECT
    COUNT(*) as eventos_restantes,
    pg_size_pretty(pg_total_relation_size('public.domain_events')) as novo_tamanho
FROM public.domain_events;
```

---

## 🔍 Queries de Análise

### Ver eventos mais antigos

```sql
SELECT
    occurred_at,
    event_type,
    entity_type
FROM public.domain_events
ORDER BY occurred_at ASC
LIMIT 10;
```

### Ver distribuição por tipo

```sql
SELECT
    event_type,
    COUNT(*) as total,
    MIN(occurred_at) as mais_antigo,
    MAX(occurred_at) as mais_recente
FROM public.domain_events
GROUP BY event_type
ORDER BY total DESC;
```

### Ver tamanho de cada tabela

```sql
SELECT
    schemaname || '.' || tablename as tabela,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as dados,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indices
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'domain_events',
        'event_context',
        'observer_execution_log',
        'metric_execution_log',
        'derived_metrics'
    )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 💾 Estimativa de Economia de Espaço

**Exemplo típico:**

| Tabela | Registros | Tamanho Antes | Após Limpeza |
|--------|-----------|---------------|--------------|
| domain_events | 100k | 50 MB | 5 MB |
| event_context | 50k | 20 MB | 2 MB |
| observer_execution_log | 5k | 5 MB | 0.5 MB |
| **TOTAL** | **155k** | **75 MB** | **7.5 MB** |

**Economia:** ~90% de espaço

---

## ✅ Checklist de Segurança

Antes de executar limpeza completa:

- [ ] Cloudflare Workers deployado há > 30 dias
- [ ] Eventos aparecendo no R2 bucket
- [ ] Monitoramento funcionando (`wrangler tail`)
- [ ] Backup feito (opcional)
- [ ] Testado em ambiente de staging primeiro
- [ ] Fora de horário de pico

---

## 🆘 Troubleshooting

### "Erro: violação de chave estrangeira"

Deletar na ordem correta:
1. `event_context` (depende de domain_events)
2. `domain_events`
3. Outras tabelas

### "VACUUM travou"

```sql
-- Ver locks
SELECT * FROM pg_stat_activity
WHERE datname = 'postgres' AND state = 'active';

-- Cancelar se necessário
SELECT pg_cancel_backend(pid) FROM pg_stat_activity
WHERE query LIKE '%VACUUM%';
```

### "Perdeu dados por engano"

Se tiver backup:
```bash
psql < backup_telemetria.sql
```

Se não tiver: dados foram para Cloudflare a partir da data de ativação.

---

## 📊 Monitoramento Contínuo

Após limpeza, configure política de retenção:

```sql
-- Criar job para limpeza automática (futuro)
-- Via pg_cron ou edge function

CREATE OR REPLACE FUNCTION cleanup_old_telemetry()
RETURNS void AS $$
BEGIN
    DELETE FROM public.domain_events
    WHERE occurred_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Rodar mensalmente
```

---

## 📞 Suporte

Se algo der errado:
1. Verificar tabelas críticas (`ferramentas`, `colaboradores`, `movimentacoes`)
2. Se OK → telemetria não afeta produto
3. Restaurar backup se necessário

---

**Última atualização:** 2025-12-26
