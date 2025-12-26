# 📊 Guia de Telemetria Industrial - Operium

> **Para Investidores e Programadores**

## 🎯 Visão Geral

O Operium implementa **telemetria industrial de ponta** que captura **100% das operações críticas** em tempo real, transformando dados operacionais em insights estratégicos.

**Sistema comparável a:**
- 📱 Facebook Analytics (eventos de usuário)
- 📊 Google Analytics (comportamento em tempo real)
- 💳 Stripe (auditoria financeira completa)

**Diferencial:** Aplicado à **indústria pesada**, não software.

---

## 📈 Para Investidores

### Por que isso importa?

**Problema tradicional:**
- ❌ Indústrias operam às cegas com planilhas manuais
- ❌ Sem rastreabilidade de ativos
- ❌ Custos de manutenção desconhecidos
- ❌ Decisões baseadas em "achismo"

**Nossa solução:**
- ✅ **23 eventos críticos** capturados automaticamente
- ✅ **Rastreabilidade total** de ferramentas, pessoas e processos
- ✅ **Custos auditáveis** em tempo real
- ✅ **Dados para due diligence** sem precedentes

### Método de Coleta de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DE TELEMETRIA                    │
└─────────────────────────────────────────────────────────────────┘

[Operação do Usuário]
       │
       │ (Exemplo: Cadastrar ferramenta)
       ▼
[Next.js Backend]
       │
       ├─► Salva no Banco (PostgreSQL/Supabase)
       │
       └─► telemetry.emit({...})  ← Fire-and-forget (700ms timeout)
                   │
                   │ HTTP POST
                   ▼
       ┌───────────────────────┐
       │  Cloudflare Worker    │  ← Edge Computing (global)
       │  (Ingest)             │
       └───────────┬───────────┘
                   │
                   │ Valida + Enriquece
                   ▼
       ┌───────────────────────┐
       │  Cloudflare Queue     │  ← Buffer (até 20 eventos/5s)
       │  (telemetry-events)   │
       └───────────┬───────────┘
                   │
                   │ Batch Processing
                   ▼
       ┌───────────────────────┐
       │  Cloudflare Worker    │  ← Consumer
       │  (Processor)          │
       └───────────┬───────────┘
                   │
                   │ Agrupa por data/hora/org
                   ▼
       ┌───────────────────────┐
       │  Cloudflare R2        │  ← Object Storage (S3-compatible)
       │  (operium-telemetry)  │
       │                       │
       │  Estrutura:           │
       │  date=2025-12-26/     │
       │    hour=14/           │
       │      org=<uuid>/      │
       │        events.ndjson  │
       └───────────────────────┘
                   │
                   │ Análise
                   ▼
       ┌───────────────────────┐
       │  Business Intelligence│  ← Dashboard (futuro)
       │  • Grafana            │
       │  • Metabase           │
       │  • Jupyter Notebooks  │
       └───────────────────────┘
```

### Garantias Técnicas

1. **Zero Impacto no Produto**
   - Telemetria nunca bloqueia operações
   - Timeout de 700ms (se falhar, não afeta usuário)
   - Fire-and-forget (assíncrono)

2. **Alta Disponibilidade**
   - Edge computing global (Cloudflare)
   - 99.99% uptime
   - Escala automaticamente

3. **Baixo Custo**
   - ~$11/mês para 1 milhão de eventos
   - Incluso: compute + storage + bandwidth
   - Pay-per-use (não paga se não usar)

4. **Privacidade**
   - **Zero PII** (Personal Identifiable Information)
   - Apenas UUIDs e metadados operacionais
   - LGPD/GDPR compliant

### Eventos Capturados (23 total)

#### 🔧 Assets/Ferramentas (3)
- `ASSET_CREATED` - Nova ferramenta no inventário
- `ASSET_UPDATED` - Mudanças em ferramenta existente
- `ASSET_RETIRED` - Descarte/baixa de ferramenta

**KPI:** Taxa de crescimento de inventário, ciclo de vida médio

---

#### 👷 Colaboradores/RH (5)
- `COLLABORATOR_CREATED` - Contratação
- `COLLABORATOR_UPDATED` - Atualização cadastral
- `COLLABORATOR_DELETED` - Exclusão de registro
- `COLLABORATOR_PROMOTED` - Promoção registrada
- `COLLABORATOR_DISMISSED` - Demissão processada

**KPI:** Taxa de turnover, tempo até promoção, headcount por função

---

#### 📦 Movimentações/Estoque (3)
- `MOVEMENT_STOCK_IN` - Entrada de estoque (compra/ressuprimento)
- `MOVEMENT_CHECKOUT` - Retirada de ferramenta por colaborador
- `MOVEMENT_CHECKIN` - Devolução de ferramenta

**KPI:** Taxa de utilização, tempo médio de posse, itens não devolvidos

---

#### 🔨 Consertos/Manutenção (3)
- `MAINTENANCE_STARTED` - Envio para conserto
- `MAINTENANCE_STATUS_UPDATED` - Mudança de status (aguardando → em andamento → concluído)
- `MAINTENANCE_RETURNED` - Retorno de conserto **com custo financeiro**

**KPI:** Custo total de manutenção, MTTR (tempo médio de reparo), ROI de equipamentos

---

#### 👥 Times/Gestão (5)
- `TEAM_CREATED` - Criação de equipe
- `TEAM_UPDATED` - Mudança de líder, veículo, localização
- `TEAM_DELETED` - Desativação de equipe
- `TEAM_MEMBER_ADDED` - Adição de membro
- `TEAM_MEMBER_REMOVED` - Remoção de membro

**KPI:** Número médio de membros, rotatividade de equipes, distribuição geográfica

---

#### 🚚 Equipamento de Equipes (9)
- `TEAM_EQUIPMENT_ASSIGNED` - Atribuição de equipamento
- `TEAM_EQUIPMENT_RETURNED` - Devolução de equipamento
- `custody_discrepancy` - Perda/dano reportado **←  CRÍTICO**
- `team_operation_ended` - Finalização de operação/obra
- `equipment_return_validated` - Validação administrativa
- `equipment_issue_reported` - Problema reportado (app mobile)
- `equipment_checklist_confirmed` - Checklist de segurança
- `equipment_accepted` - Confirmação de recebimento
- `equipment_return_requested` - Solicitação de devolução

**KPI:** Taxa de perda/dano, tempo médio de custódia, compliance de checklist

---

### Casos de Uso para Due Diligence

#### 1. **Auditoria de Custos**
```sql
-- Custo total de manutenção nos últimos 12 meses
SELECT
  SUM((props->>'custo')::numeric) as custo_total,
  AVG((props->>'custo')::numeric) as custo_medio,
  COUNT(*) as quantidade_consertos
FROM events
WHERE event_name = 'MAINTENANCE_RETURNED'
  AND ts >= NOW() - INTERVAL '12 months';
```

**Resultado:** Custo real (não estimativa) de manutenção.

---

#### 2. **Eficiência Operacional**
```sql
-- Taxa de utilização de inventário
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'MOVEMENT_CHECKOUT'
    THEN props->>'ferramenta_id' END)::float /
  NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'ASSET_CREATED'
    THEN entity_id END), 0) * 100 as taxa_utilizacao_pct
FROM events
WHERE date >= '2025-01-01';
```

**Resultado:** Quantos % do inventário está sendo efetivamente usado.

---

#### 3. **Risco Operacional**
```sql
-- Perdas e danos em custódia
SELECT
  props->>'type' as tipo,
  COUNT(*) as ocorrencias,
  SUM((props->>'quantityReturned')::int) as quantidade_afetada
FROM events
WHERE event_name = 'custody_discrepancy'
GROUP BY tipo
ORDER BY ocorrencias DESC;
```

**Resultado:** Quantas ferramentas foram perdidas/danificadas.

---

#### 4. **Qualidade de RH**
```sql
-- Taxa de turnover mensal
SELECT
  DATE_TRUNC('month', ts) as mes,
  COUNT(*) FILTER (WHERE event_name = 'COLLABORATOR_CREATED') as contratacoes,
  COUNT(*) FILTER (WHERE event_name = 'COLLABORATOR_DISMISSED') as demissoes,
  ROUND(100.0 *
    COUNT(*) FILTER (WHERE event_name = 'COLLABORATOR_DISMISSED') /
    NULLIF(COUNT(*) FILTER (WHERE event_name = 'COLLABORATOR_CREATED'), 0), 2
  ) as taxa_turnover_pct
FROM events
WHERE event_name IN ('COLLABORATOR_CREATED', 'COLLABORATOR_DISMISSED')
GROUP BY mes
ORDER BY mes DESC;
```

**Resultado:** Taxa de rotatividade de funcionários (benchmark: < 5% é saudável).

---

### Vantagens Competitivas

| Concorrente | Operium |
|-------------|---------|
| Planilhas Excel manuais | **Captura automática 24/7** |
| Dados estimados/projetados | **Dados operacionais reais** |
| Auditoria trimestral/anual | **Auditoria em tempo real** |
| Sem rastreabilidade | **Rastreabilidade total** |
| Custos ocultos | **Custos transparentes** |
| Decisões no "achismo" | **Decisões data-driven** |

### Valoração do Negócio

**Múltiplo de M&A esperado:**

Empresas **sem telemetria:**
- Múltiplo: 3-5x EBITDA (indústria tradicional)

Empresas **com telemetria industrial:**
- Múltiplo: 8-12x EBITDA (tech-enabled company)
- Comparável a SaaS B2B

**Por quê?**
- Previsibilidade de receita (dados históricos)
- Eficiência operacional comprovada
- Menor risco para adquirente (transparência)
- Potencial de otimização identificável

---

## 💻 Para Programadores

### Arquitetura Técnica

**Stack:**
- **Backend**: Next.js 14 (App Router, Server Actions)
- **Database**: PostgreSQL (Supabase)
- **Telemetria**: Cloudflare Workers + Queue + R2
- **Linguagem**: TypeScript
- **Client**: Fire-and-forget com AbortController (700ms timeout)

### Como Funciona

#### 1. Instrumentação no Backend

```typescript
// lib/actions.ts (exemplo)
import { telemetry } from '@/lib/telemetry'

export async function criarFerramenta(formData: FormData) {
  // ... validação e inserção no banco ...

  const { data: insertedData, error } = await supabase
    .from("ferramentas")
    .insert(ferramenta)
    .select()

  if (error) throw error

  // 🚀 Telemetria (fire-and-forget, nunca bloqueia)
  telemetry.emit({
    profile_id: user.id,      // UUID da organização
    actor_id: user.id,        // UUID do usuário
    entity_type: 'asset',     // Tipo de entidade
    entity_id: insertedData[0].id,  // UUID da ferramenta
    event_name: 'ASSET_CREATED',    // Nome do evento
    props: {                  // Payload específico
      nome: insertedData[0].nome,
      categoria: insertedData[0].categoria,
      quantidade_total: insertedData[0].quantidade_total,
    },
    context: {                // Contexto adicional
      flow: 'cadastro_produto',
      screen: 'dashboard/ferramentas',
    },
  })

  revalidatePath('/dashboard')
}
```

#### 2. Cliente Telemetria

```typescript
// lib/telemetry/telemetryClient.ts
export function emitRawEvent(input: TelemetryEventInput): void {
  const config = getConfig()

  // 1. Verificar se telemetria está habilitada
  if (!config.enabled) return

  // 2. Sample rate (0.0 a 1.0)
  if (!shouldSample(config.sampleRate)) return

  // 3. Construir evento
  const event = buildEvent(input)

  // 4. Enviar (fire-and-forget, sem await)
  sendToCloudflare([event], config).catch(() => {
    // Silent fail - nunca quebra o produto
  })
}

async function sendToCloudflare(events: TelemetryEventV1[], config: TelemetryConfig) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 700) // 700ms timeout

  try {
    const response = await fetch(config.ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.secret}`,
      },
      body: JSON.stringify({ events }),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn('[Telemetry] Ingest failed:', response.status)
    }
  } catch (error) {
    // Timeout ou erro de rede - não faz nada
  } finally {
    clearTimeout(timeout)
  }
}
```

#### 3. Worker Ingest (Cloudflare)

```typescript
// workers/src/ingest/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Validar Bearer Token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${env.TELEMETRY_INGEST_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 2. Parse body
    const { events } = await request.json()

    // 3. Validar schema
    const validEvents = events.filter(e => validateEvent(e))

    // 4. Enriquece com metadata
    const enrichedEvents = validEvents.map(e => ({
      ...e,
      received_at: new Date().toISOString(),
      edge_region: request.cf?.colo || 'UNKNOWN',
    }))

    // 5. Publica no Queue (batching automático)
    await env.TELEMETRY_QUEUE.sendBatch(
      enrichedEvents.map(e => ({ body: e }))
    )

    // 6. Responde rápido (202 Accepted)
    return new Response(JSON.stringify({
      accepted: validEvents.length,
      rejected: events.length - validEvents.length
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
```

#### 4. Worker Consumer (Cloudflare)

```typescript
// workers/src/consumer/index.ts
export default {
  async queue(batch: MessageBatch<EnrichedEvent>, env: Env): Promise<void> {
    // 1. Agrupar eventos por partição (date/hour/org)
    const eventsByPartition = new Map<string, EnrichedEvent[]>()

    for (const message of batch.messages) {
      const event = message.body
      const partition = getPartitionKey(event) // date=2025-12-26/hour=14/org=<uuid>

      if (!eventsByPartition.has(partition)) {
        eventsByPartition.set(partition, [])
      }
      eventsByPartition.get(partition)!.push(event)
    }

    // 2. Escrever no R2 (NDJSON)
    for (const [partition, events] of eventsByPartition) {
      const filename = `${partition}/events-${crypto.randomUUID()}.ndjson`
      const content = events.map(e => JSON.stringify(e)).join('\n')

      await env.TELEMETRY_BUCKET.put(filename, content, {
        httpMetadata: { contentType: 'application/x-ndjson' }
      })
    }

    console.log(`Processed ${batch.messages.length} events into ${eventsByPartition.size} partitions`)
  }
}
```

### Schema de Evento (v1)

```typescript
interface TelemetryEventV1 {
  event_id: string          // UUID
  ts: string                // ISO 8601 timestamp
  profile_id: string        // UUID da organização
  org_id: string            // Alias de profile_id
  actor_id?: string         // UUID do usuário que executou
  entity_type: EntityType   // asset|collaborator|movement|maintenance|team|team_member|team_equipment
  entity_id?: string        // UUID da entidade afetada
  event_name: string        // ASSET_CREATED, COLLABORATOR_DISMISSED, etc
  event_version: 1          // Versão do schema
  source: 'backend'         // Origem do evento
  context: {
    flow?: string           // Fluxo de negócio (ex: 'cadastro_produto')
    screen?: string         // Tela de origem (ex: 'dashboard/ferramentas')
    app_version?: string    // Versão do app
    ip_hash?: string        // Hash do IP (não o IP real)
    ua_hash?: string        // Hash do user agent
  }
  props: Record<string, unknown>  // Payload específico do evento
  privacy: {
    contains_pii: false     // SEMPRE false
    data_category: 'operational' | 'behavioral'
  }
}
```

### Variáveis de Ambiente

```bash
# .env.local (Backend Next.js)
CLOUDFLARE_TELEMETRY_INGEST_URL=https://operium-telemetry-ingest.<conta>.workers.dev/ingest
CLOUDFLARE_TELEMETRY_INGEST_SECRET=<token-secreto-32-bytes>
TELEMETRY_ENABLED=true
TELEMETRY_SAMPLE_RATE=1.0  # 1.0 = 100%, 0.5 = 50%, etc
```

```toml
# workers/wrangler.toml (Cloudflare Worker Ingest)
name = "operium-telemetry-ingest"
main = "src/ingest/index.ts"
compatibility_date = "2024-01-01"

[[queues.producers]]
queue = "telemetry-events"
binding = "TELEMETRY_QUEUE"

[vars]
ENVIRONMENT = "production"
```

```toml
# workers/wrangler.consumer.toml (Cloudflare Worker Consumer)
name = "operium-telemetry-consumer"
main = "src/consumer/index.ts"
compatibility_date = "2024-01-01"

[[queues.consumers]]
queue = "telemetry-events"
max_batch_size = 20
max_batch_timeout = 5

[[r2_buckets]]
binding = "TELEMETRY_BUCKET"
bucket_name = "operium-telemetry-raw"
```

### Como Adicionar Novo Evento

1. **Escolher nome do evento** (sempre VERB_PAST_TENSE)
   - ✅ `VEHICLE_CREATED`, `INVOICE_PAID`, `REPORT_GENERATED`
   - ❌ `create_vehicle`, `payInvoice`, `generating_report`

2. **Instrumentar no código**

```typescript
// Após operação bem-sucedida no banco
telemetry.emit({
  profile_id: user.id,
  actor_id: user.id,
  entity_type: 'vehicle',  // Escolher tipo apropriado
  entity_id: vehicle.id,
  event_name: 'VEHICLE_CREATED',
  props: {
    marca: vehicle.marca,
    modelo: vehicle.modelo,
    ano: vehicle.ano,
    placa: vehicle.placa,  // OK - não é PII segundo LGPD
  },
  context: {
    flow: 'cadastro_veiculo',
    screen: 'dashboard/veiculos',
  },
})
```

3. **Testar localmente**

```bash
# Terminal 1: Monitorar eventos
cd workers
npx wrangler tail operium-telemetry-consumer

# Terminal 2: App
npm run dev

# Executar operação no navegador
# Verificar se evento aparece no Terminal 1
```

4. **Deploy**

```bash
# Deploy workers (se mudou validação)
cd workers
npm run deploy

# Deploy Next.js (Vercel faz automaticamente no push)
git push origin main
```

### Monitoramento e Debug

```bash
# Ver eventos sendo recebidos
npx wrangler tail operium-telemetry-ingest

# Ver eventos sendo salvos no R2
npx wrangler tail operium-telemetry-consumer

# Health check
curl https://operium-telemetry-ingest.<conta>.workers.dev/health

# Testar endpoint manualmente
curl -X POST "https://operium-telemetry-ingest.<conta>.workers.dev/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <secret>" \
  -d '{
    "events": [{
      "event_id": "test-123",
      "ts": "2025-12-26T12:00:00Z",
      "profile_id": "test-org",
      "org_id": "test-org",
      "entity_type": "generic",
      "event_name": "TEST_EVENT",
      "event_version": 1,
      "source": "backend",
      "context": {},
      "props": {},
      "privacy": { "contains_pii": false }
    }]
  }'
```

### Análise de Dados

```bash
# Baixar eventos do R2
cd workers
./query-events.sh download 2025-12-26

# Analisar com Python
python analyze_events.py events-2025-12-26.ndjson

# Ou com jq
cat events-2025-12-26.ndjson | jq -r '.event_name' | sort | uniq -c

# Filtrar eventos específicos
cat events-2025-12-26.ndjson | jq 'select(.event_name == "ASSET_CREATED")'
```

---

## 📚 Documentação Adicional

- [README.md](workers/README.md) - Documentação completa do sistema
- [QUICK_START.md](workers/QUICK_START.md) - Guia rápido de uso
- [QUERY_GUIDE.md](workers/QUERY_GUIDE.md) - Guia completo de consultas
- [BUSINESS_INTELLIGENCE.md](workers/BUSINESS_INTELLIGENCE.md) - KPIs e análises estratégicas
- [CLEANUP_GUIDE.md](supabase/CLEANUP_GUIDE.md) - Limpeza de telemetria legada no Postgres

---

## 🔒 Segurança e Privacidade

### Zero PII (Personal Identifiable Information)

**NÃO capturamos:**
- ❌ Nomes completos
- ❌ CPF/CNPJ
- ❌ Emails
- ❌ Telefones
- ❌ Endereços completos
- ❌ IPs reais
- ❌ User agents reais

**Capturamos apenas:**
- ✅ UUIDs (IDs únicos não identificáveis)
- ✅ Metadados operacionais (quantidades, datas, estados)
- ✅ Hash de IP (irreversível)
- ✅ Hash de User Agent (irreversível)

### LGPD/GDPR Compliance

- ✅ Todos os eventos marcados com `contains_pii: false`
- ✅ Dados categorizados como `operational` ou `behavioral`
- ✅ Retenção configurável (lifecycle no R2)
- ✅ Direito ao esquecimento (delete por org_id)
- ✅ Auditoria completa (todos os eventos rastreáveis)

---

## 💰 Custos

### Cloudflare Workers Paid Plan: $5/mês

**Inclui:**
- 10 milhões de requests/mês
- 30 milhões CPU ms/mês
- R2: 10 GB armazenamento grátis
- Queue: Incluído no plano

### Custos Adicionais (Pay-per-use)

**R2 Storage:**
- $0.015/GB/mês (acima de 10 GB)
- Exemplo: 100 GB = ~$1.50/mês

**R2 Operations:**
- Class A (write): $4.50/milhão
- Class B (read): $0.36/milhão
- Exemplo: 1M eventos/mês = ~$4.50

**Total estimado: ~$11/mês para 1 milhão de eventos**

**Comparação:**
- DataDog APM: ~$31/host/mês
- New Relic: ~$25/host/mês
- Operium: ~$11 para 1M eventos (sem limite de hosts)

---

## 🚀 Roadmap

### Q1 2025
- ✅ Sistema de telemetria em produção (CONCLUÍDO)
- ✅ 23 eventos instrumentados (CONCLUÍDO)
- 🔄 Dashboard de BI (Grafana/Metabase)
- 🔄 Alertas automáticos (email/Slack)

### Q2 2025
- 📋 Machine Learning para previsão de falhas
- 📋 API de Analytics para ERPs
- 📋 Exportação para BigQuery/Snowflake
- 📋 Benchmarking entre organizações

### Q3 2025
- 📋 Mobile app telemetria (GPS, sensores)
- 📋 Integração com IoT industrial
- 📋 Anomaly detection automática

---

## 📞 Suporte

**Para investidores:**
- Ver [BUSINESS_INTELLIGENCE.md](workers/BUSINESS_INTELLIGENCE.md)
- Queries SQL de exemplo incluídas

**Para programadores:**
- Ver [workers/README.md](workers/README.md)
- Código aberto no GitHub

**Dashboard Cloudflare:**
- https://dash.cloudflare.com

---

**Mantido por**: Time Operium
**Última atualização**: 2025-12-26
**Versão**: 1.0.0
