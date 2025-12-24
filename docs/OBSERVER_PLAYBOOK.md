# Observer Playbook - Guia Operacional

## Objetivo

Este documento fornece procedimentos operacionais para manutenção e troubleshooting do sistema de observers comportamentais.

---

## 1. Verificar Saúde dos Observers

### Via SQL

```sql
-- Status geral de todos os observers
SELECT * FROM v_observer_health 
ORDER BY profile_id, observer_name;
```

**Interpretar resultado:**
- `hours_since_last_run > 2`: Observer atrasado (deveria rodar hourly)
- `last_status = 'FAILURE'`: Investigar erro em `observer_execution_log`
- `last_events_generated = 0`: Normal se não houver padrões detectados

### Via API (Curl)

```bash
# Executar observer manualmente
curl -X GET https://your-app.vercel.app/api/cron/observers \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Resposta esperada:**
```json
{
  "success": true,
  "profiles_processed": 5,
  "profiles_success": 5,
  "total_events_generated": 12
}
```

---

## 2. Executar Observer Manualmente

### Para um perfil específico

```sql
-- Executar todos os observers
SELECT fn_run_all_observers('profile_id_aqui');

-- Executar observer individual
SELECT fn_observe_repeated_late_returns('profile_id_aqui');
SELECT fn_observe_missing_actions('profile_id_aqui');
SELECT fn_observe_process_deviations('profile_id_aqui');
SELECT fn_observe_operational_friction('profile_id_aqui');
```

### Para todas as organizações (via cron)

```bash
# Localmente (desenvolvimento)
curl -X GET http://localhost:3000/api/cron/observers \
  -H "Authorization: Bearer development-secret"

# Produção
curl -X GET https://operium.vercel.app/api/cron/observers \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 3. Debugging de Falhas

### Passo 1: Identificar falhas recentes

```sql
SELECT 
    observer_name,
    status,
    error_message,
    started_at,
    execution_duration_ms
FROM observer_execution_log
WHERE status IN ('FAILURE', 'PARTIAL_SUCCESS')
  AND started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;
```

### Passo 2: Ver detalhes do erro

```sql
SELECT 
    *
FROM observer_execution_log
WHERE id = 'execution_id_do_erro';
```

### Passo 3: Verificar eventos de ingestão

```sql
SELECT 
    event_type,
    error_message,
    error_detail,
    created_at
FROM event_ingestion_errors
WHERE source_table = 'derived_events'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Erros Comuns

**Erro: "Payload too large"**
```
Causa: Payload > 2KB
Solução: Reduzir supporting_event_ids (limitar a 10)
```

**Erro: "Invalid or disabled derived event type"**
```
Causa: event_type não existe em derived_event_types
Solução: Verificar typo no nome do evento
```

**Erro: "Timeout"**
```
Causa: Observer processando volume muito alto
Solução: Adicionar LIMIT à query ou processar em múltiplos batches
```

---

## 4. Backfill de Dados Históricos

### Quando usar

- Após adicionar novo observer
- Após corrigir bug em observer existente
- Para reprocessar período específico

### Procedimento

**Passo 1:** Limpar watermark do observer

```sql
-- Ver watermark atual
SELECT * FROM observer_state 
WHERE observer_name = 'fn_observe_repeated_late_returns';

-- Resetar watermark (reprocessa tudo)
DELETE FROM observer_state 
WHERE profile_id = 'your_profile_id' 
  AND observer_name = 'fn_observe_repeated_late_returns';
```

**Passo 2:** Executar observer

```sql
SELECT fn_observe_repeated_late_returns('your_profile_id');
```

**Passo 3:** Verificar eventos gerados

```sql
SELECT 
    event_type,
    payload->>'severity' as severity,
    occurred_at
FROM domain_events
WHERE profile_id = 'your_profile_id'
  AND event_type = 'REPEATED_LATE_RETURN_PATTERN'
  AND ingested_at >= NOW() - INTERVAL '1 hour'
ORDER BY occurred_at DESC;
```

**⚠️ ATENÇÃO:** Backfill pode gerar duplicatas se deduplicação falhar. Sempre testar em staging primeiro.

---

## 5. Adicionar Novo Observer

### Template de Implementação

```sql
-- 1. Adicionar tipo ao catálogo
INSERT INTO derived_event_types (
    event_type, category, display_name, description,
    severity_logic, observer_function, observer_version
) VALUES (
    'NEW_PATTERN_NAME',
    'behavioral', -- ou 'pattern', 'deviation', 'friction'
    'Nome Legível',
    'Descrição detalhada do padrão',
    'LOW: X, MEDIUM: Y, HIGH: Z',
    'fn_observe_new_pattern',
    '1.0'
);

-- 2. Criar função do observer
CREATE OR REPLACE FUNCTION fn_observe_new_pattern(p_profile_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_events_generated INTEGER := 0;
    v_events_skipped INTEGER := 0;
    v_events_analyzed INTEGER := 0;
BEGIN
    -- Lógica de detecção aqui
    
    -- Registrar execução
    PERFORM fn_mark_observer_execution(
        p_profile_id := p_profile_id,
        p_observer_name := 'fn_observe_new_pattern',
        p_observer_version := '1.0',
        p_last_event_id := (SELECT MAX(id) FROM domain_events WHERE profile_id = p_profile_id),
        p_events_generated := v_events_generated,
        p_events_skipped := v_events_skipped,
        p_events_analyzed := v_events_analyzed,
        p_status := 'SUCCESS',
        p_execution_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER
    );
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    -- Error handling (ver observers existentes como exemplo)
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Adicionar ao fn_run_all_observers
-- (Editar função existente para incluir novo observer)

-- 4. Testar
SELECT fn_observe_new_pattern('test_profile_id');
```

---

## 6. Modificar Lógica de Observer Existente

### Procedimento Seguro

**Passo 1:** Incrementar versão

```sql
UPDATE derived_event_types
SET observer_version = '1.1',
    updated_at = NOW()
WHERE event_type = 'REPEATED_LATE_RETURN_PATTERN';
```

**Passo 2:** Atualizar função com nova lógica

```sql
CREATE OR REPLACE FUNCTION fn_observe_repeated_late_returns(...)
RETURNS JSONB AS $$
BEGIN
    -- Nova lógica aqui
    -- Atualizar observer_version para '1.1' no payload
END;
$$ LANGUAGE plpgsql;
```

**Passo 3:** Testar em staging

```sql
-- Executar em profile de teste
SELECT fn_observe_repeated_late_returns('staging_profile_id');

-- Verificar eventos gerados
SELECT * FROM domain_events
WHERE event_type = 'REPEATED_LATE_RETURN_PATTERN'
  AND payload->>'observer_version' = '1.1';
```

**Passo 4:** Deploy para produção

Eventos antigos (versão 1.0) permanecem válidos. Nova versão co-existe.

---

## 7. Performance Tuning

### Identificar Observers Lentos

```sql
SELECT 
    observer_name,
    AVG(execution_duration_ms) as avg_duration_ms,
    MAX(execution_duration_ms) as max_duration_ms,
    COUNT(*) as execution_count
FROM observer_execution_log
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY observer_name
ORDER BY avg_duration_ms DESC;
```

### Otimizações Recomendadas

**1. Adicionar LIMIT às queries**
```sql
-- Processar em batches de 100
FOR v_record IN
    SELECT ... 
    FROM domain_events
    WHERE ...
    LIMIT 100
LOOP
```

**2. Usar índices específicos**
```sql
-- Se observer filtra por event_type + occurred_at frequentemente
CREATE INDEX idx_domain_events_type_occurred 
ON domain_events(event_type, occurred_at DESC)
WHERE event_source = 'user';
```

**3. Filtrar por watermark**
```sql
-- Processar apenas eventos novos
WHERE de.id > v_last_processed_id
```

---

## 8. Monitoramento Proativo

### Alertas Recomendados

**1. Observer não executou nas últimas 2 horas**
```sql
SELECT * FROM v_observer_health
WHERE hours_since_last_run > 2;
```

**2. Taxa de falha > 10%**
```sql
SELECT 
    observer_name,
    COUNT(*) FILTER (WHERE status = 'FAILURE') * 100.0 / COUNT(*) as failure_rate
FROM observer_execution_log
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY observer_name
HAVING (COUNT(*) FILTER (WHERE status = 'FAILURE') * 100.0 / COUNT(*)) > 10;
```

**3. Zero eventos gerados por 24h (suspeito)**
```sql
SELECT 
    observer_name,
    SUM(events_generated) as total_events
FROM observer_execution_log
WHERE started_at >= NOW() - INTERVAL '24 hours'
GROUP BY observer_name
HAVING SUM(events_generated) = 0;
```

---

## 9. Rollback de Observer

### Cenário: Observer bugado gerando eventos incorretos

**Passo 1:** Desabilitar observer

```sql
UPDATE derived_event_types
SET enabled = FALSE
WHERE event_type = 'BUGGY_EVENT_TYPE';
```

**Passo 2:** Marcar eventos gerados como inválidos (soft delete)

```sql
-- Adicionar flag ao payload
UPDATE domain_events
SET payload = payload || '{"_invalidated": true, "_reason": "Observer bug"}'::jsonb
WHERE event_type = 'BUGGY_EVENT_TYPE'
  AND event_source = 'automation'
  AND occurred_at >= '2024-12-24 00:00:00';
```

**⚠️ NUNCA DELETE:** Manter histórico completo para auditoria.

**Passo 3:** Corrigir observer

```sql
-- Incrementar versão e corrigir lógica
UPDATE derived_event_types SET observer_version = '1.1' ...
CREATE OR REPLACE FUNCTION ...
```

**Passo 4:** Reabilitar

```sql
UPDATE derived_event_types
SET enabled = TRUE
WHERE event_type = 'BUGGY_EVENT_TYPE';
```

---

## 10. Checklist de Deploy

Antes de fazer deploy de novos observers ou modificações:

- [ ] Testar função em staging com dados reais
- [ ] Verificar tamanho de payload (< 2KB)
- [ ] Confirmar idempotência (executar 2x, verificar sem duplicatas)
- [ ] Validar performance (< 5s por 1000 eventos)
- [ ] Atualizar documentação (observers rationale)
- [ ] Incrementar versão em `derived_event_types`
- [ ] Adicionar testes em `tests/observers.test.sql`

---

## Contato

Para suporte técnico, consulte:
- Documentação: [DERIVED_EVENTS_SYSTEM.md](./DERIVED_EVENTS_SYSTEM.md)
- Migrations: `supabase/migrations/105_*.sql` e `106_*.sql`
