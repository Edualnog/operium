# Sistema de Enforcement de Eventos - OPERIUM

## Visão Geral

Este documento descreve o sistema de **enforcement de eventos** implementado para garantir coleta **end-to-end**, **auditável** e **mensurável** de todas as ações operacionais na plataforma Operium.

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE APLICAÇÃO                                │
│  (Frontend React / API Next.js / Supabase Client)                           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TABELAS OPERACIONAIS                                 │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ferrament.│ │movimentacoes │ │consertos │ │vehicles  │ │teams         │   │
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       │              │              │            │              │           │
│       └──────────────┴──────────────┴────────────┴──────────────┘           │
│                                     │                                        │
│                    TRIGGERS (trg_enforce_event_*)                           │
│                                     │                                        │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      fn_generic_event_trigger()                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. Consulta event_policy para obter entity_type e event_type         │ │
│  │  2. Extrai profile_id e entity_id do registro                         │ │
│  │  3. Calcula changed_fields (diff entre OLD e NEW)                     │ │
│  │  4. Monta payload completo com before/after/metadata                  │ │
│  │  5. Chama fn_emit_domain_event()                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      fn_emit_domain_event()                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  VALIDAÇÕES:                                                          │ │
│  │  ✓ profile_id obrigatório                                             │ │
│  │  ✓ entity_type em lista permitida                                     │ │
│  │  ✓ event_source em lista permitida                                    │ │
│  │                                                                        │ │
│  │  EM ERRO → Grava em event_ingestion_errors → Re-raise exception       │ │
│  │  EM SUCESSO → Retorna event_id                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          domain_events                                       │
│  (Tabela imutável, append-only, fonte de verdade histórica)                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ id | profile_id | entity_type | entity_id | event_type | payload   │    │
│  │ occurred_at | ingested_at | event_source                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                     TRIGGER (trg_auto_event_context)
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         fn_auto_event_context()                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  1. Infere turno (day/night/weekend) pelo horário                     │ │
│  │  2. Define valores default (urgency=medium, pressure=normal)          │ │
│  │  3. Insere em event_context                                           │ │
│  │  4. Permite enriquecimento posterior                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          event_context                                       │
│  (Contexto causal e operacional de cada evento)                             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ event_id | shift | urgency_level | operational_pressure |           │    │
│  │ was_outside_process | deviation_reason | context_metadata           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

                              AUDITORIA E HEALTH CHECK
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│fn_detect_missing_ │   │fn_event_pipeline_     │   │fn_calculate_event_    │
│events()           │   │health_check()         │   │coverage()             │
│                   │   │                       │   │                       │
│Compara registros  │   │Valida:                │   │Retorna taxa global    │
│operacionais vs    │   │• Eventos/hora > 0     │   │de cobertura (%)       │
│domain_events      │   │• Erros = 0            │   │                       │
│                   │   │• Coverage >= 99%      │   │Meta: >= 99%           │
│Retorna IDs        │   │• Contextos OK         │   │                       │
│faltantes          │   │                       │   │                       │
└─────────┬─────────┘   └───────────┬───────────┘   └───────────┬───────────┘
          │                         │                           │
          │                         ▼                           │
          │             ┌───────────────────────┐               │
          │             │ operational_alerts    │               │
          │             │ (severity=CRITICAL)   │◄──────────────┘
          │             └───────────────────────┘
          │
          ▼
┌───────────────────────┐
│event_ingestion_errors │
│(Log de erros)         │
└───────────────────────┘
```

---

## Política de Eventos (Fonte da Verdade)

A tabela `event_policy` define explicitamente quais ações geram quais eventos:

### Tabelas Cobertas

| Tabela | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|
| `ferramentas` | TOOL_CREATED | TOOL_UPDATED | TOOL_DELETED |
| `movimentacoes` | MOVEMENT_CREATED | MOVEMENT_UPDATED | MOVEMENT_DELETED |
| `consertos` | REPAIR_CREATED | REPAIR_UPDATED | REPAIR_DELETED |
| `inventarios` | INVENTORY_CREATED | INVENTORY_UPDATED | INVENTORY_DELETED |
| `inventario_itens` | INVENTORY_ITEM_ADDED | INVENTORY_ITEM_COUNTED | INVENTORY_ITEM_REMOVED |
| `inventario_ajustes` | INVENTORY_ADJUSTMENT_CREATED | INVENTORY_ADJUSTMENT_UPDATED | INVENTORY_ADJUSTMENT_DELETED |
| `teams` | TEAM_CREATED | TEAM_UPDATED | TEAM_DELETED |
| `team_members` | TEAM_MEMBER_ADDED | TEAM_MEMBER_UPDATED | TEAM_MEMBER_REMOVED |
| `team_equipment` | TEAM_EQUIPMENT_ASSIGNED | TEAM_EQUIPMENT_UPDATED | TEAM_EQUIPMENT_REMOVED |
| `team_assignments` | TEAM_ASSIGNMENT_STARTED | TEAM_ASSIGNMENT_UPDATED | TEAM_ASSIGNMENT_DELETED |
| `vehicles` | VEHICLE_CREATED | VEHICLE_UPDATED | VEHICLE_DELETED |
| `vehicle_maintenances` | VEHICLE_MAINTENANCE_CREATED | VEHICLE_MAINTENANCE_UPDATED | VEHICLE_MAINTENANCE_DELETED |
| `vehicle_costs` | VEHICLE_COST_CREATED | VEHICLE_COST_UPDATED | VEHICLE_COST_DELETED |
| `vehicle_usage_events` | VEHICLE_USAGE_CREATED | VEHICLE_USAGE_UPDATED | VEHICLE_USAGE_DELETED |
| `colaboradores` | COLLABORATOR_CREATED | COLLABORATOR_UPDATED | COLLABORATOR_DELETED |
| `equipment_issues` | EQUIPMENT_ISSUE_REPORTED | EQUIPMENT_ISSUE_UPDATED | EQUIPMENT_ISSUE_DELETED |
| `equipment_notifications` | EQUIPMENT_NOTIFICATION_SENT | EQUIPMENT_NOTIFICATION_READ | EQUIPMENT_NOTIFICATION_DELETED |

### Entity Types Permitidos

```
tool, asset, vehicle, collaborator, inventory, product,
movement, repair, maintenance, cost, generic, team, system
```

### Event Sources Permitidos

```
system, user, automation, import, migration, trigger, api
```

---

## Funções Principais

### 1. `fn_emit_domain_event()`

**Função central e ÚNICA para emissão de eventos.**

```sql
fn_emit_domain_event(
    p_profile_id UUID,        -- Obrigatório
    p_entity_type TEXT,       -- Deve estar na lista permitida
    p_entity_id UUID,         -- ID da entidade
    p_event_type TEXT,        -- Tipo do evento
    p_event_source TEXT,      -- Origem (default: 'trigger')
    p_payload JSONB,          -- Dados do evento
    p_occurred_at TIMESTAMPTZ -- Timestamp real
) RETURNS UUID
```

**Garantias:**
- Nunca falha silenciosamente
- Valida entity_type e event_source
- Em erro, grava em `event_ingestion_errors` antes de propagar
- Retorna o `event_id` criado

### 2. `fn_generic_event_trigger()`

**Trigger genérico usado por todas as tabelas.**

- Consulta `event_policy` para determinar o evento
- Extrai `profile_id` automaticamente (inclusive de tabelas relacionadas)
- Calcula `changed_fields` com diff automático
- Monta payload completo com `before`, `after`, `metadata`
- **Em caso de erro, loga mas NÃO bloqueia a operação original**

### 3. `fn_auto_event_context()`

**Gera contexto automaticamente para cada evento.**

- Infere turno pelo horário (day/night/weekend)
- Define valores default para urgency e pressure
- Permite enriquecimento posterior

### 4. `fn_detect_missing_events()`

**Auditoria de cobertura por tabela.**

```sql
SELECT * FROM fn_detect_missing_events(
    p_profile_id UUID,      -- NULL = todas
    p_lookback_hours INT    -- default: 24
);
```

Retorna:
- `source_table`: Nome da tabela
- `missing_count`: Registros sem evento
- `total_records`: Total de registros
- `coverage_rate`: Taxa de cobertura (%)
- `sample_missing_ids`: Amostra de IDs para investigação

### 5. `fn_calculate_event_coverage()`

**Taxa de cobertura global agregada.**

```sql
SELECT * FROM fn_calculate_event_coverage(p_profile_id, 24);
```

Retorna:
- `total_records`: Total de registros
- `total_missing`: Total sem evento
- `coverage_rate`: Taxa global (%)
- `tables_below_threshold`: Tabelas < 99%
- `check_timestamp`: Timestamp da verificação

### 6. `fn_event_pipeline_health_check()`

**Verificação completa de saúde do pipeline.**

Valida:
1. **Eventos por hora** > 0 (WARNING se 0)
2. **Erros de ingestão** = 0 (CRITICAL se > 10)
3. **Cobertura** >= 99% (CRITICAL se < 95%)
4. **Eventos sem contexto** = 0 (CRITICAL se > 10)

**Ações automáticas:**
- Registra execução em `metric_execution_log`
- Gera `operational_alert` severity=CRITICAL em caso de falha

### 7. `fn_backfill_missing_events()`

**Recupera eventos de registros existentes.**

```sql
SELECT * FROM fn_backfill_missing_events(
    p_profile_id UUID,
    p_source_table TEXT,    -- 'ferramentas', 'movimentacoes', etc.
    p_limit INT             -- default: 100
);
```

---

## Estrutura do Payload

Todo evento gerado pelos triggers contém um payload padronizado:

```json
{
    "source_table": "ferramentas",
    "source_id": "uuid-do-registro",
    "operation": "UPDATE",
    "before": {
        "id": "uuid",
        "nome": "Furadeira",
        "quantidade_disponivel": 5
    },
    "after": {
        "id": "uuid",
        "nome": "Furadeira Industrial",
        "quantidade_disponivel": 3
    },
    "changed_fields": {
        "nome": {
            "from": "Furadeira",
            "to": "Furadeira Industrial"
        },
        "quantidade_disponivel": {
            "from": 5,
            "to": 3
        }
    },
    "trigger_name": "trg_enforce_event_ferramentas",
    "trigger_timestamp": "2024-12-24T10:30:00Z"
}
```

---

## Views de Monitoramento

### `v_event_system_status`

Status rápido do sistema de eventos:

```sql
SELECT * FROM v_event_system_status;
```

| component | last_24h_count | last_1h_count | last_event_at |
|-----------|----------------|---------------|---------------|
| domain_events | 1234 | 45 | 2024-12-24 10:30:00 |
| event_context | 1234 | 45 | 2024-12-24 10:30:00 |
| event_ingestion_errors | 2 | 0 | 2024-12-24 09:15:00 |

### `v_active_event_policies`

Políticas ativas e status de enforcement:

```sql
SELECT * FROM v_active_event_policies;
```

| source_table | operation | entity_type | event_type | enforcement_status |
|--------------|-----------|-------------|------------|-------------------|
| ferramentas | INSERT | tool | TOOL_CREATED | ENFORCED |
| ferramentas | UPDATE | tool | TOOL_UPDATED | ENFORCED |

---

## Métricas Registradas

### `EVENT_COVERAGE_RATE`

- **Tipo**: system
- **Frequência**: hourly
- **Meta**: >= 99%
- **Alerta**: Automático se < 99%

---

## Tabelas Cobertas vs Pendentes

### Cobertas (com triggers de enforcement)

| Tabela | Trigger | Status |
|--------|---------|--------|
| ferramentas | trg_enforce_event_ferramentas | ATIVO |
| movimentacoes | trg_enforce_event_movimentacoes | ATIVO |
| consertos | trg_enforce_event_consertos | ATIVO |
| inventarios | trg_enforce_event_inventarios | ATIVO |
| inventario_itens | trg_enforce_event_inventario_itens | ATIVO |
| inventario_ajustes | trg_enforce_event_inventario_ajustes | ATIVO |
| teams | trg_enforce_event_teams | ATIVO |
| team_members | trg_enforce_event_team_members | ATIVO |
| team_equipment | trg_enforce_event_team_equipment | ATIVO |
| team_assignments | trg_enforce_event_team_assignments | ATIVO |
| vehicles | trg_enforce_event_vehicles | ATIVO |
| vehicle_maintenances | trg_enforce_event_vehicle_maintenances | ATIVO |
| vehicle_costs | trg_enforce_event_vehicle_costs | ATIVO |
| vehicle_usage_events | trg_enforce_event_vehicle_usage_events | ATIVO |
| colaboradores | trg_enforce_event_colaboradores | ATIVO |
| equipment_issues | trg_enforce_event_equipment_issues | ATIVO (condicional) |
| equipment_notifications | trg_enforce_event_equipment_notifications | ATIVO (condicional) |

### Pendentes (podem ser adicionadas)

| Tabela | Razão | Prioridade |
|--------|-------|------------|
| profiles | Dados sensíveis de usuário | BAIXA |
| vehicle_behavior_features | Tabela derivada/calculada | BAIXA |
| operium_profiles | Dados de usuário por organização | BAIXA |

---

## Observações de Risco e Performance

### Riscos

1. **Triggers em tabelas de alto volume**
   - `movimentacoes` e `vehicle_usage_events` podem ter alto throughput
   - Mitigação: O trigger captura erros e não bloqueia a operação

2. **Cascata de eventos em operações batch**
   - Um UPDATE em massa pode gerar milhares de eventos
   - Mitigação: Considerar desabilitar triggers temporariamente para operações batch

3. **Profile_id não encontrado**
   - Tabelas que referenciam outras (team_members, inventario_itens)
   - Mitigação: O trigger busca profile_id nas tabelas pai via JOIN

### Performance

1. **Índices otimizados**
   - `idx_event_policy_table` para lookup rápido de política
   - `idx_domain_events_payload` (GIN) para busca em payload

2. **Função IMMUTABLE**
   - `fn_calculate_changed_fields` é IMMUTABLE para cache de planner

3. **Exception handling não-bloqueante**
   - Erros no trigger são logados mas não bloqueiam a operação original
   - Prioridade: integridade operacional > geração de evento

4. **Backfill incremental**
   - `fn_backfill_missing_events` processa em lotes (default: 100)
   - Pode ser executado múltiplas vezes sem duplicar eventos

---

## Como Usar

### 1. Executar Health Check

```sql
SELECT * FROM fn_event_pipeline_health_check('seu-profile-id');
```

### 2. Verificar Cobertura

```sql
SELECT * FROM fn_calculate_event_coverage('seu-profile-id', 24);
```

### 3. Investigar Eventos Faltantes

```sql
SELECT * FROM fn_detect_missing_events('seu-profile-id', 24);
```

### 4. Fazer Backfill de Dados Existentes

```sql
SELECT * FROM fn_backfill_missing_events('seu-profile-id', 'ferramentas', 1000);
SELECT * FROM fn_backfill_missing_events('seu-profile-id', 'movimentacoes', 1000);
SELECT * FROM fn_backfill_missing_events('seu-profile-id', 'vehicles', 1000);
SELECT * FROM fn_backfill_missing_events('seu-profile-id', 'teams', 1000);
```

### 5. Adicionar Nova Tabela ao Sistema

1. Inserir política em `event_policy`:
```sql
INSERT INTO event_policy (source_table, operation, entity_type, event_type, description)
VALUES
    ('nova_tabela', 'INSERT', 'novo_tipo', 'NOVO_TIPO_CREATED', 'Descrição'),
    ('nova_tabela', 'UPDATE', 'novo_tipo', 'NOVO_TIPO_UPDATED', 'Descrição'),
    ('nova_tabela', 'DELETE', 'novo_tipo', 'NOVO_TIPO_DELETED', 'Descrição');
```

2. Criar trigger:
```sql
CREATE TRIGGER trg_enforce_event_nova_tabela
    AFTER INSERT OR UPDATE OR DELETE ON nova_tabela
    FOR EACH ROW
    EXECUTE FUNCTION fn_generic_event_trigger();
```

### 6. Desabilitar Temporariamente para Batch

```sql
-- Desabilitar
ALTER TABLE ferramentas DISABLE TRIGGER trg_enforce_event_ferramentas;

-- Executar operação batch
UPDATE ferramentas SET categoria = 'nova_categoria' WHERE ...;

-- Reabilitar
ALTER TABLE ferramentas ENABLE TRIGGER trg_enforce_event_ferramentas;
```

---

## Versionamento

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 2024-12-24 | Implementação inicial do sistema de enforcement |

---

## Contato

Para dúvidas sobre o sistema de eventos, consulte a equipe de arquitetura de dados.
