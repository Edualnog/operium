# 🚀 Quick Start - Consultar Eventos de Telemetria

## Como Funciona

Os eventos são salvos no **R2 Bucket** `operium-telemetry-raw` em formato NDJSON, particionados por:
```
date=YYYY-MM-DD/hour=HH/org=<uuid>/events-<uuid>.ndjson
```

---

## 📱 Método 1: Cloudflare Dashboard (Mais Fácil)

### Ver eventos no navegador:

1. **Acesse o dashboard do R2:**
   https://dash.cloudflare.com/2767eff050e4e616bb74ec9b826a81c1/r2/buckets

2. **Clique em `operium-telemetry-raw`**

3. **Navegue pelas pastas:**
   - `date=2025-12-26` → `hour=12` → `org=<uuid>` → `events-xxx.ndjson`

4. **Baixe o arquivo** clicando nele

5. **Abra o arquivo** em um editor de texto ou rode:
   ```bash
   cat events-xxx.ndjson | jq '.'
   ```

---

## 🔍 Método 2: Monitorar Logs em Tempo Real

### Ver eventos chegando ao vivo:

```bash
cd /Users/macbookair/apps/operium/workers

# Ver logs do Consumer (eventos sendo salvos no R2)
npx wrangler tail operium-telemetry-consumer

# Ver logs do Ingest (eventos chegando)
npx wrangler tail operium-telemetry-ingest
```

**O que você verá:**
```
[CONSUMER] Processed 5 events into 2 partitions
```

---

## 🧪 Método 3: Testar o Sistema

### Gerar um evento de teste:

```bash
# Do diretório raiz do projeto
cd /Users/macbookair/apps/operium

# Inicie o servidor Next.js
npm run dev
```

Agora no navegador (http://localhost:3000):
1. Faça login
2. Crie uma ferramenta, registre uma retirada, ou delete algo
3. Volte no terminal e veja os logs com `npx wrangler tail`

---

## 📊 Método 4: Análise via Python (Quando tiver arquivos)

### Baixar arquivo do dashboard e analisar:

```bash
cd /Users/macbookair/apps/operium/workers

# Depois de baixar um arquivo .ndjson do dashboard
python analyze_events.py ~/Downloads/events-xxx.ndjson
```

**Output esperado:**
```
📊 ESTATÍSTICAS GERAIS
Total de eventos: 42
Organizações únicas: 1
Tipos de evento: 4

📋 EVENTOS POR TIPO
  MOVEMENT_CHECKOUT           15 ( 35.7%)
  MOVEMENT_CHECKIN            12 ( 28.6%)
  TOOL_CREATED                10 ( 23.8%)
  MAINTENANCE_STARTED          5 ( 11.9%)
```

---

## 🎯 Exemplo Completo de Fluxo

### 1. Gerar evento no app
```bash
# Terminal 1: Servidor Next.js
cd /Users/macbookair/apps/operium
npm run dev

# No navegador: Faça uma retirada de ferramenta
```

### 2. Ver evento chegando
```bash
# Terminal 2: Monitorar logs
cd /Users/macbookair/apps/operium/workers
npx wrangler tail operium-telemetry-ingest

# Você verá algo como:
# {
#   "event_name": "MOVEMENT_CHECKOUT",
#   "entity_type": "movement",
#   "org_id": "xxx",
#   ...
# }
```

### 3. Ver evento sendo salvo
```bash
# Terminal 3: Monitorar consumer
npx wrangler tail operium-telemetry-consumer

# Você verá:
# [CONSUMER] Processed 1 events into 1 partitions
```

### 4. Baixar e analisar
1. Vá ao dashboard: https://dash.cloudflare.com/.../r2/buckets/operium-telemetry-raw
2. Navegue até a pasta de hoje
3. Baixe o arquivo `.ndjson`
4. Analise:
   ```bash
   python analyze_events.py ~/Downloads/events-xxx.ndjson
   ```

---

## 🆘 Troubleshooting

### "Não vejo eventos no R2"

Verifique:
```bash
# 1. Telemetria está habilitada?
cat /Users/macbookair/apps/operium/.env.local | grep TELEMETRY_ENABLED
# Deve mostrar: TELEMETRY_ENABLED=true

# 2. Servidor está rodando com as novas variáveis?
# Reinicie o servidor Next.js

# 3. Faça uma operação no app (criar ferramenta, retirada, etc)

# 4. Veja os logs
cd /Users/macbookair/apps/operium/workers
npx wrangler tail operium-telemetry-ingest
```

### "Erro ao fazer tail"

```bash
# Certifique-se de estar autenticado
cd /Users/macbookair/apps/operium/workers
npx wrangler login
```

---

## 📝 Comandos Úteis - Cheat Sheet

```bash
# Ver logs do ingest
npx wrangler tail operium-telemetry-ingest

# Ver logs do consumer
npx wrangler tail operium-telemetry-consumer

# Testar endpoint manualmente
curl -X POST "https://operium-telemetry-ingest.erisson-eduardo.workers.dev/ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 4c072edf5f2f8a8a0ca1691af5beb1775b743c9c0398c5183a584921c1b65bd2" \
  -d '{"event_id":"test","ts":"2025-12-26T12:00:00Z","profile_id":"test","org_id":"test","entity_type":"generic","event_name":"TEST","event_version":1,"source":"backend","context":{},"props":{},"privacy":{"contains_pii":false}}'

# Health check
curl https://operium-telemetry-ingest.erisson-eduardo.workers.dev/health

# Analisar arquivo baixado
python analyze_events.py arquivo.ndjson

# Ver eventos com jq
cat arquivo.ndjson | jq '.event_name' | sort | uniq -c

# Filtrar eventos específicos
cat arquivo.ndjson | jq 'select(.event_name == "MOVEMENT_CHECKOUT")'
```

---

## 🎓 Próximos Passos

1. **Teste local**: Rode o app e gere alguns eventos
2. **Monitore**: Use `wrangler tail` para ver eventos em tempo real
3. **Analise**: Baixe arquivos do R2 e use o script Python
4. **Dashboard**: Considere criar visualizações com Grafana/Metabase

---

**Dashboard do R2:** https://dash.cloudflare.com/2767eff050e4e616bb74ec9b826a81c1/r2/buckets/operium-telemetry-raw
