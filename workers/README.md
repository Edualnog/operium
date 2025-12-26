# Telemetria Industrial - Cloudflare Workers

Sistema de telemetria industrial para captura de eventos operacionais com isolamento total do banco de dados transacional.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Setup Inicial](#setup-inicial)
- [Uso](#uso)
- [Consulta de Dados](#consulta-de-dados)
- [Monitoramento](#monitoramento)
- [Manutenção](#manutenção)

---

## 🎯 Visão Geral

### Problema Resolvido
- ❌ **Antes**: Triggers no Postgres causavam locks, latência e rollbacks
- ✅ **Agora**: Telemetria isolada, sem impacto no produto

### Características
- 🚀 **Fire-and-forget**: Nunca bloqueia operações do usuário
- 📊 **Alto volume**: Processa milhares de eventos/dia
- 💰 **Baixo custo**: Infraestrutura serverless com pay-per-use
- 🔒 **Privacidade**: Zero PII, apenas metadados operacionais
- 📈 **Escalável**: Cresce automaticamente com a demanda

---

## 🏗️ Arquitetura

```
┌─────────────┐
│   Backend   │  Next.js 14 (Vercel)
│  (Produto)  │
└──────┬──────┘
       │ HTTP POST (fire-and-forget, 700ms timeout)
       ▼
┌─────────────────────┐
│  Worker Ingest      │  Cloudflare Worker
│  POST /ingest       │  - Valida Bearer Token
│                     │  - Valida schema
│                     │  - Enriquece com metadata
└──────┬──────────────┘
       │ Publish
       ▼
┌─────────────────────┐
│   Queue             │  telemetry-events
│   (Buffer)          │  - Batch até 20 eventos
│                     │  - Timeout 5s
└──────┬──────────────┘
       │ Consume
       ▼
┌─────────────────────┐
│  Worker Consumer    │  Cloudflare Worker
│  (Processor)        │  - Agrupa por date/hour/org
│                     │  - Escreve NDJSON
└──────┬──────────────┘
       │ Write
       ▼
┌─────────────────────┐
│   R2 Bucket         │  operium-telemetry-raw
│   (Storage)         │  - Append-only
│                     │  - Particionado
│                     │  - Lifecycle opcional
└─────────────────────┘
```

### Fluxo de Dados

1. **Backend → Worker**: POST com evento JSON
2. **Worker → Queue**: Validação + enriquecimento
3. **Queue → Consumer**: Batching automático
4. **Consumer → R2**: Persistência em NDJSON particionado

### Particionamento R2

```
operium-telemetry-raw/
├── date=2025-12-26/
│   ├── hour=14/
│   │   └── org=<uuid>/
│   │       └── events-<uuid>.ndjson
│   └── hour=15/
│       └── org=<uuid>/
│           └── events-<uuid>.ndjson
└── date=2025-12-27/
    └── ...
```

---

## 🚀 Setup Inicial

### Pré-requisitos

- Node.js 18+
- Conta Cloudflare (Workers Paid Plan)
- Wrangler CLI instalado

### 1. Instalar Dependências

```bash
cd workers
npm install
```

### 2. Login no Cloudflare

```bash
npx wrangler login
```

### 3. Criar Infraestrutura

```bash
# Criar R2 bucket
npx wrangler r2 bucket create operium-telemetry-raw

# Criar Queue
npx wrangler queues create telemetry-events

# Gerar token secreto
openssl rand -hex 32

# Salvar secret no Cloudflare
npx wrangler secret put TELEMETRY_INGEST_SECRET
# Cole o token gerado acima
```

### 4. Deploy dos Workers

```bash
npm run deploy
```

Você verá as URLs deployadas:
```
✅ https://operium-telemetry-ingest.erisson-eduardo.workers.dev
✅ https://operium-telemetry-consumer.erisson-eduardo.workers.dev
```

### 5. Configurar Backend

No arquivo raiz `.env.local`:

```env
CLOUDFLARE_TELEMETRY_INGEST_URL=https://operium-telemetry-ingest.<sua-conta>.workers.dev/ingest
CLOUDFLARE_TELEMETRY_INGEST_SECRET=<token-gerado-acima>
TELEMETRY_ENABLED=true
TELEMETRY_SAMPLE_RATE=1.0
```

### 6. Configurar Vercel (Produção)

Adicione as mesmas variáveis no dashboard do Vercel:
- Settings → Environment Variables

---

## 🎮 Uso

### Eventos Instrumentados

Atualmente instrumentados em `lib/actions.ts`:

| Evento | Quando Dispara | Entity Type |
|--------|----------------|-------------|
| `ASSET_RETIRED` | Ferramenta deletada | `asset` |
| `MOVEMENT_CHECKOUT` | Retirada de ferramenta | `movement` |
| `MOVEMENT_CHECKIN` | Devolução de ferramenta | `movement` |
| `MAINTENANCE_STARTED` | Envio para conserto | `maintenance` |

### Como Adicionar Novos Eventos

```typescript
import { telemetry } from '@/lib/telemetry';

// Após operação bem-sucedida no banco
telemetry.emit({
  profile_id: user.id,           // UUID da organização
  actor_id: user.id,             // UUID do usuário
  entity_type: 'tool',           // Tipo de entidade
  entity_id: toolId,             // UUID da entidade (opcional)
  event_name: 'TOOL_CREATED',    // Nome do evento (VERBO_PASSADO)
  props: {                       // Payload específico
    nome: 'Furadeira',
    categoria: 'Ferramentas Elétricas'
  },
  context: {                     // Contexto opcional
    flow: 'cadastro_ferramenta',
    screen: 'dashboard/ferramentas'
  }
});
```

### Schema do Evento (v1)

```typescript
{
  event_id: string,              // UUID (gerado automaticamente)
  ts: string,                    // ISO 8601 (gerado automaticamente)
  profile_id: string,            // UUID da org (obrigatório)
  org_id: string,                // Alias de profile_id
  actor_id?: string,             // UUID do usuário
  entity_type: EntityType,       // tool|movement|vehicle|etc
  entity_id?: string,            // UUID da entidade
  event_name: string,            // VERB_PAST_TENSE
  event_version: 1,              // Versão do schema
  source: 'backend',             // Origem do evento
  context: {
    flow?: string,
    screen?: string,
    app_version?: string,
    ip_hash?: string,
    ua_hash?: string
  },
  props: Record<string, unknown>, // Dados específicos
  privacy: {
    contains_pii: false,
    data_category: 'operational'
  }
}
```

---

## 📊 Consulta de Dados

### Método 1: Cloudflare Dashboard (Mais Fácil)

1. Acesse: https://dash.cloudflare.com → R2
2. Clique em `operium-telemetry-raw`
3. Navegue pelas pastas
4. Baixe arquivo `.ndjson`
5. Analise com editor ou `jq`

### Método 2: Logs em Tempo Real

```bash
# Ver eventos sendo recebidos
npx wrangler tail operium-telemetry-ingest

# Ver eventos sendo salvos no R2
npx wrangler tail operium-telemetry-consumer
```

### Método 3: Script de Análise Python

```bash
# Baixar arquivo do dashboard primeiro
python analyze_events.py ~/Downloads/events-xxx.ndjson
```

**Output:**
```
📊 ESTATÍSTICAS GERAIS
Total de eventos: 1,234
Organizações únicas: 5
Tipos de evento: 8

📋 EVENTOS POR TIPO
  MOVEMENT_CHECKOUT           456 ( 36.9%)
  MOVEMENT_CHECKIN            389 ( 31.5%)
  TOOL_CREATED                234 ( 19.0%)
  MAINTENANCE_STARTED         155 ( 12.6%)
```

### Método 4: Consultas com jq

```bash
# Contar tipos de eventos
cat events.ndjson | jq -r '.event_name' | sort | uniq -c

# Filtrar eventos específicos
cat events.ndjson | jq 'select(.event_name == "MOVEMENT_CHECKOUT")'

# Extrair propriedades
cat events.ndjson | jq -r '[.ts, .event_name, .entity_type] | @csv'

# Estatísticas por organização
cat events.ndjson | jq -r '.org_id' | sort | uniq -c
```

---

## 📈 Monitoramento

### Health Check

```bash
# Verificar status do Worker
curl https://operium-telemetry-ingest.erisson-eduardo.workers.dev/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-12-26T12:00:00.000Z"
}
```

### Métricas no Dashboard

**Cloudflare Dashboard → Workers:**
- Requests/segundo
- CPU Time
- Errors
- Success Rate

**Cloudflare Dashboard → Queues:**
- Messages in Queue
- Throughput
- Processing Time

**Cloudflare Dashboard → R2:**
- Storage Used
- Operations (Class A/B)
- Egress

### Alertas Recomendados

- Queue depth > 1000 (backlog)
- Error rate > 1%
- Storage > 80% do limite

---

## 🔧 Manutenção

### Redeploy de Workers

```bash
cd workers
npm run deploy
```

### Atualizar Secret

```bash
# Gerar novo token
openssl rand -hex 32

# Atualizar no Cloudflare
npx wrangler secret put TELEMETRY_INGEST_SECRET

# Atualizar .env.local
# Atualizar Vercel env vars
```

### Limpar Dados Antigos (Opcional)

```bash
# Via dashboard: R2 → Lifecycle Rules
# Exemplo: Deletar eventos > 1 ano
```

### Troubleshooting

#### "Eventos não aparecem no R2"

1. Verificar telemetria habilitada:
   ```bash
   cat ../.env.local | grep TELEMETRY_ENABLED
   ```

2. Ver logs do ingest:
   ```bash
   npx wrangler tail operium-telemetry-ingest
   ```

3. Testar endpoint manualmente:
   ```bash
   curl -X POST https://operium-telemetry-ingest.erisson-eduardo.workers.dev/ingest \
     -H "Authorization: Bearer <SEU_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"event_id":"test",...}'
   ```

#### "Erro 401 Unauthorized"

- Verificar `CLOUDFLARE_TELEMETRY_INGEST_SECRET` no `.env.local`
- Verificar secret no Cloudflare: `npx wrangler secret list`

#### "Queue backlog crescendo"

- Verificar logs do consumer: `npx wrangler tail operium-telemetry-consumer`
- Aumentar `max_batch_size` em `wrangler.consumer.toml`
- Verificar R2 não está com problema

---

## 📚 Recursos

### Documentação Adicional

- [QUICK_START.md](./QUICK_START.md) - Guia rápido de uso
- [QUERY_GUIDE.md](./QUERY_GUIDE.md) - Guia completo de consultas
- [analyze_events.py](./analyze_events.py) - Script de análise
- [query-events.sh](./query-events.sh) - Script de download

### Links Úteis

- **Dashboard Cloudflare**: https://dash.cloudflare.com
- **R2 Docs**: https://developers.cloudflare.com/r2/
- **Workers Docs**: https://developers.cloudflare.com/workers/
- **Queues Docs**: https://developers.cloudflare.com/queues/

---

## 💰 Custos Estimados

### Cloudflare Workers Paid Plan: $5/mês

Inclui:
- 10 milhões de requests/mês
- 30 milhões CPU ms/mês
- R2: 10 GB armazenamento grátis
- Queue: Incluído no plano

### Custos Adicionais (Pay-per-use)

**R2 Storage:**
- $0.015/GB/mês (acima de 10 GB)
- Estimativa: 100 GB = ~$1.50/mês

**R2 Operations:**
- Class A (write): $4.50/milhão
- Class B (read): $0.36/milhão
- Estimativa: 1M events/mês = ~$4.50

**Total estimado: ~$11/mês** para 1 milhão de eventos

---

## 🔐 Segurança

### Proteções Implementadas

- ✅ Autenticação via Bearer Token
- ✅ Validação de schema
- ✅ Rate limiting (Cloudflare nativo)
- ✅ Zero PII nos eventos
- ✅ CORS configurado

### Checklist de Segurança

- [ ] Rotacionar secret a cada 90 dias
- [ ] Monitorar error rates
- [ ] Revisar eventos para PII acidental
- [ ] Backup de dados críticos
- [ ] Documentar incidentes

---

## 📝 Changelog

### v1.0.0 (2025-12-26)

**Inicial Release:**
- ✅ Worker Ingest HTTP
- ✅ Worker Consumer Queue → R2
- ✅ Backend client (lib/telemetry)
- ✅ 4 eventos instrumentados
- ✅ Scripts de análise
- ✅ Documentação completa

---

## 🤝 Contribuindo

Para adicionar novos eventos:

1. Editar `lib/telemetry/types.ts` se necessário
2. Adicionar chamada `telemetry.emit()` após operação
3. Testar localmente
4. Deploy para produção
5. Documentar no README

---

## 📞 Suporte

- **Issues**: GitHub Issues
- **Docs**: Este README + arquivos `.md` em `/workers`
- **Dashboard**: https://dash.cloudflare.com

---

**Mantido por**: Time Operium
**Última atualização**: 2025-12-26
