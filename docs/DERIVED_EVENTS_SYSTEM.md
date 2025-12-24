# Sistema de Eventos Derivados - OPERIUM

## Visão Geral

O **Sistema de Eventos Derivados** é uma camada de inteligência comportamental que analisa automaticamente eventos históricos e gera sinais de segunda ordem (derived events) sem intervenção do usuário.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE EVENTOS: Primary → Derived                       │
└─────────────────────────────────────────────────────────────────────────────┘

    EVENTOS PRIMÁRIOS                 OBSERVERS                EVENTOS DERIVADOS
    (Ações do usuário)          (Análise automática)        (Sinais comportamentais)
           │                             │                            │
           │                             │                            │
    ┌──────▼──────┐                ┌────▼────┐                ┌──────▼──────┐
    │TOOL_MOVEMENT│───────────────▶│Observer │───────────────▶│REPEATED_LATE│
    │_OUT         │                │Pattern  │                │_RETURN_     │
    │             │                │Detection│                │PATTERN      │
    └─────────────┘                └─────────┘                └─────────────┘
           │                             │                            │
    ┌──────▼──────┐                ┌────▼────┐                ┌──────▼──────┐
    │TOOL_MOVEMENT│───────────────▶│Observer │───────────────▶│EXPECTED_    │
    │_RETURN      │                │Missing  │                │ACTION_NOT_  │
    │(late)       │                │Actions  │                │TAKEN        │
    └─────────────┘                └─────────┘                └─────────────┘
           │                             │                            │
           │                             │                            │
           ▼                             ▼                            ▼
      domain_events         fn_run_all_observers()            domain_events
   (event_source=user)            (hourly)               (event_source=automation)
           │                             │                            │
           │                             │                            │
           └─────────────────────────────┴────────────────────────────┘
                                         │
                                         ▼
                              collaborator_behavior_features
                                         │
                                         ▼
                                 derived_metrics
                                         │
                                         ▼
                              operational_alerts
                         (apenas HIGH/CRITICAL)
```

---

## Arquitetura

### 1. Camada de Infraestrutura

**Tabelas:**
- `derived_event_types` - Catálogo de padrões comportamentais
- `observer_execution_log` - Histórico de execuções
- `observer_state` - Watermarks para processamento incremental

**Funções Helper:**
- `fn_safe_emit_derived_event()` - Emite evento com deduplicação
- `fn_get_last_processed_event_id()` - Retorna watermark
- `fn_mark_observer_execution()` - Registra execução

### 2. Camada de Observers

Quatro observers comportamentais implementados:

| Observer | Função | Detecção | Severidade |
|----------|--------|----------|------------|
| **Repeated Late Returns** | `fn_observe_repeated_late_returns` | Colaborador com 3+ atrasos em 30 dias | MEDIUM (3-5), HIGH (6-10), CRITICAL (10+) |
| **Expected Action Not Taken** | `fn_observe_missing_actions` | Devoluções 7+ dias após prazo | HIGH (7-14 dias), CRITICAL (14+ dias) |
| **Process Deviation** | `fn_observe_process_deviations` | Consertos sem dano prévio | MEDIUM |
| **Operational Friction** | `fn_observe_operational_friction` | 5+ trocas ferramenta/7dias | LOW (5-9), MEDIUM (10+) |

**Função Master:**
```sql
SELECT fn_run_all_observers('profile_id');
```

Executa todos os observers em sequência com isolamento de erros.

### 3. Camada de Integração com Métricas

**Impacto em `collaborator_behavior_features`:**
- `responsibility_score`: -10 pontos por `REPEATED_LATE_RETURN_PATTERN`
- `risk_exposure_score`: +5 pontos por `OPERATIONAL_FRICTION_SIGNAL`
- `process_adherence_score`: -5 pontos por `PROCESS_DEVIATION_DETECTED`

**Novas Métricas:**
- `PROCESS_ADHERENCE_RATE`: % de operações sem desvios
- `OPERATIONAL_FRICTION_INDEX`: Score composto de fricção (0-100)

**Alertas:**
- Apenas eventos derivados com severidade `HIGH` ou `CRITICAL` geram alertas
- Eventos `LOW` e `MEDIUM` são silenciosos (apenas registrados)

### 4. Camada de Scheduling

**Vercel Cron:**
- Endpoint: `/api/cron/observers`
- Frequência: Hourly (`0 * * * *`)
- Autenticação: Bearer token (`CRON_SECRET`)
- Timeout: 50s (limite Vercel: 60s)

---

## Diferença: Eventos Primários vs Derivados

| Aspecto | Eventos Primários | Eventos Derivados |
|---------|-------------------|-------------------|
| **Origem** | Ações diretas do usuário | Análise automática por observers |
| **event_source** | `user`, `system`, `trigger` | `automation` |
| **Frequência** | Tempo real (imediato) | Batch (hourly) |
| **Deduplicação** | Nenhuma (cada ação = 1 evento) | Hash-based (evita duplicatas) |
| **Payload** | Snapshot do estado | Padrão detectado + supporting_event_ids |
| **Exemplo** | `TOOL_MOVEMENT_OUT` | `REPEATED_LATE_RETURN_PATTERN` |

---

## Rationale dos Observers

### 1. REPEATED_LATE_RETURN_PATTERN

**Por que existe:**
Colaboradores com padrão recorrente de atrasos representam risco operacional maior que atrasos isolados. Este observer identifica comportamento sistemático, não incidentes únicos.

**Lógica de detecção:**
```sql
SELECT COUNT(*) FROM tool_returns
WHERE delay_days > 0
  AND occurred_at >= NOW() - INTERVAL '30 days'
GROUP BY colaborador_id
HAVING COUNT(*) >= 3;
```

**Uso:**
- Reduz `responsibility_score` no cálculo de features
- Gera alerta se HIGH/CRITICAL
- Usado para priorização de treinamentos

---

### 2. EXPECTED_ACTION_NOT_TAKEN

**Por que existe:**
Ferramentas não devolvidas após prazo indicam perda, negligência ou esquecimento. Detectar proativamente permite ação antes de perda total.

**Lógica de detecção:**
```sql
SELECT * FROM tool_checkouts
WHERE prazo_devolucao < NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
      SELECT 1 FROM tool_returns 
      WHERE ferramenta_id = tool_checkouts.ferramenta_id
  );
```

**Grace period:** 7 dias após prazo (evita falsos positivos).

**Uso:**
- Dispara alertas CRITICAL se > 14 dias
- Alimenta `incident_rate`
- Permite follow-up automático

---

### 3. PROCESS_DEVIATION_DETECTED

**Por que existe:**
Desvios de processo (ex: conserto sem registro de dano) indicam:
- Documentação incompleta
- Bypass de fluxo padrão
- Possível fraude ou erro de processo

**Lógica de detecção:**
Verifica sequência esperada de eventos. Exemplo:
```
ESPERADO: TOOL_DAMAGED → TOOL_REPAIR_CREATED
DETECTADO: TOOL_REPAIR_CREATED (sem damage prévio)
```

**Uso:**
- Reduz `process_adherence_score`
- Identifica gaps de documentação
- Indica necessidade de treinamento

---

### 4. OPERATIONAL_FRICTION_SIGNAL

**Por que existe:**
Trocas frequentes da mesma ferramenta indicam:
- Ferramenta inadequada para tarefa
- Problema de qualidade da ferramenta
- Ineficiência operacional

**Lógica de detecção:**
```sql
SELECT COUNT(*) FROM tool_movements
WHERE colaborador_id = X 
  AND ferramenta_id = Y
  AND occurred_at >= NOW() - INTERVAL '7 days'
HAVING COUNT(*) >= 5;
```

**Uso:**
- Aumenta `risk_exposure_score`
- Sinaliza necessidade de revisão de ferramentas
- Detecta padrões de ineficiência

---

## Idempotência e Deduplicação

**Estratégia:**
1. **Hash de payload** (sem timestamps dinâmicos)
2. **Watermarks** (`observer_state.last_processed_event_id`)
3. **Janela de deduplicação**: 24 horas

**Exemplo:**
```sql
-- Hash exclui campos dinâmicos
v_dedup_hash := md5(
    profile_id || entity_type || entity_id || event_type ||
    (payload - 'generated_at' - 'supporting_event_ids')
);

-- Verifica duplicatas recentes
IF EXISTS (
    SELECT 1 FROM domain_events
    WHERE payload->>'dedup_hash' = v_dedup_hash
      AND occurred_at >= NOW() - INTERVAL '24 hours'
) THEN
    RETURN NULL; -- Skip duplicata
END IF;
```

---

## Versionamento de Algoritmos

Cada observer tem versão registrada em `observer_version`:

```sql
INSERT INTO derived_event_types (event_type, observer_version)
VALUES ('REPEATED_LATE_RETURN_PATTERN', '1.0');
```

**Ao atualizar lógica:**
1. Incrementar versão (`1.0` → `1.1`)
2. Atualizar função SQL
3. Documentar changelog em `observer_changelog` (TODO: criar tabela)
4. Manter backward compatibility (eventos antigos continuam válidos)

---

## Payload Standards

**Máximo:** 2KB (validado em `fn_safe_emit_derived_event`)

**Estrutura padrão:**
```json
{
  "severity": "HIGH",
  "supporting_event_ids": ["uuid1", "uuid2", "..."],
  "observer_version": "1.0",
  "dedup_hash": "md5hash",
  "generated_at": "2024-12-24T18:00:00Z",
  
  // Campos específicos do padrão
  "late_return_count": 5,
  "avg_delay_days": 4.2,
  "time_window_days": 30
}
```

**Restrições:**
- ❌ Sem PII (nomes, emails, endereços)
- ✅ Apenas IDs e métricas agregadas
- ✅ Timestamps em ISO 8601
- ✅ Números com precisão limitada (2 casas decimais)

---

## Monitoramento

### Health Check

```sql
SELECT * FROM v_observer_health;
```

**Retorna:**
- Última execução de cada observer
- Status (SUCCESS/FAILURE)
- Eventos gerados nas últimas 24h
- Tempo desde última execução

### Logs de Execução

```sql
SELECT * FROM observer_execution_log
WHERE profile_id = 'your-id'
ORDER BY started_at DESC
LIMIT 10;
```

**Métricas:**
- `events_generated`: Eventos derivados criados
- `events_skipped`: Duplicatas evitadas
- `events_analyzed`: Total de eventos primários analisados
- `execution_duration_ms`: Tempo de execução

---

## Troubleshooting

### Observer não está rodando

**Check 1:** Verificar cron
```bash
curl -X GET https://your-app.vercel.app/api/cron/observers \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Check 2:** Ver logs
```sql
SELECT * FROM observer_execution_log 
WHERE status != 'SUCCESS' 
ORDER BY started_at DESC LIMIT 5;
```

### Eventos duplicados

**Verificar hash:**
```sql
SELECT 
    event_type,
    payload->>'dedup_hash' as hash,
    COUNT(*) 
FROM domain_events
WHERE event_source = 'automation'
GROUP BY event_type, payload->>'dedup_hash'
HAVING COUNT(*) > 1;
```

Se duplicatas: revisar lógica de hash em observer específico.

### Performance lenta

**Check índices:**
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'domain_events'
ORDER BY idx_scan;
```

Se `idx_scan = 0`: índice não está sendo usado. Revisar query plans.

---

## Backfill de Eventos Históricos

Para gerar eventos derivados de dados históricos:

```sql
-- 1. Limpar watermark para forçar reprocessamento
DELETE FROM observer_state 
WHERE profile_id = 'your-id' 
  AND observer_name = 'fn_observe_repeated_late_returns';

-- 2. Executar observer manualmente
SELECT fn_observe_repeated_late_returns('your-id');

-- 3. Verificar eventos gerados
SELECT * FROM domain_events
WHERE event_type = 'REPEATED_LATE_RETURN_PATTERN'
  AND profile_id = 'your-id'
ORDER BY occurred_at DESC;
```

---

## Roadmap

- [ ] Observer 5: `MAINTENANCE_OVERDUE_PATTERN` (veículos)
- [ ] Observer 6: `INVENTORY_SHRINKAGE_SIGNAL` (perdas recorrentes)
- [ ] Tabela `observer_changelog` para histórico de versões
- [ ] Dashboard de observability (UI)
- [ ] Alertas via notificação push
- [ ] ML-based pattern detection (phase 2)

---

## Versionamento

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 2024-12-24 | Implementação inicial com 4 observers |

---

## Contato

Para dúvidas ou sugestões sobre o sistema de eventos derivados, consulte a documentação técnica em `supabase/migrations/105_*.sql` e `106_*.sql`.
