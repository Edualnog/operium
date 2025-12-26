# Guia de Consulta de Eventos - Telemetria Operium

## 📊 Onde estão os dados?

Os eventos de telemetria são armazenados no **R2 Bucket** em formato **NDJSON** (Newline Delimited JSON), particionados por:
- **Data** (YYYY-MM-DD)
- **Hora** (HH)
- **Organização** (org_id)

### Estrutura de Pastas no R2
```
operium-telemetry-raw/
├── date=2025-12-26/
│   ├── hour=12/
│   │   ├── org=<org_uuid_1>/
│   │   │   ├── events-<uuid1>.ndjson
│   │   │   └── events-<uuid2>.ndjson
│   │   └── org=<org_uuid_2>/
│   │       └── events-<uuid3>.ndjson
│   └── hour=13/
│       └── org=<org_uuid_1>/
│           └── events-<uuid4>.ndjson
└── date=2025-12-27/
    └── ...
```

---

## 1️⃣ Via Cloudflare Dashboard (Interface Gráfica)

### Acessar o R2 Bucket
1. Acesse: https://dash.cloudflare.com/2767eff050e4e616bb74ec9b826a81c1/r2/buckets
2. Clique em **`operium-telemetry-raw`**
3. Navegue pelas pastas: `date=YYYY-MM-DD` → `hour=HH` → `org=<uuid>`
4. Clique em um arquivo `.ndjson` para visualizar/baixar

### Visualizar eventos
- Cada linha do arquivo NDJSON é um evento JSON completo
- Use um editor de texto ou ferramentas como `jq` para processar

---

## 2️⃣ Via Wrangler CLI (Linha de Comando)

### Listar arquivos de hoje
```bash
cd /Users/macbookair/apps/operium/workers

# Listar todos os arquivos do dia atual
npx wrangler r2 object list operium-telemetry-raw \
  --prefix "date=$(date +%Y-%m-%d)/"
```

### Listar eventos de uma organização específica
```bash
# Substitua <ORG_UUID> pelo UUID da organização
npx wrangler r2 object list operium-telemetry-raw \
  --prefix "date=2025-12-26/hour=12/org=<ORG_UUID>/"
```

### Baixar um arquivo específico
```bash
# Substitua pelo caminho completo do arquivo
npx wrangler r2 object get operium-telemetry-raw \
  "date=2025-12-26/hour=12/org=<ORG_UUID>/events-<FILE_UUID>.ndjson" \
  --file events.ndjson

# Visualizar eventos (um por linha)
cat events.ndjson | jq '.'
```

### Baixar todos os eventos de hoje
```bash
# Listar todos os arquivos de hoje
npx wrangler r2 object list operium-telemetry-raw \
  --prefix "date=$(date +%Y-%m-%d)/" \
  --json > files.json

# Baixar cada arquivo (exemplo simplificado)
cat files.json | jq -r '.objects[].key' | while read key; do
  npx wrangler r2 object get operium-telemetry-raw "$key" --file "$(basename $key)"
done

# Combinar todos em um único arquivo
cat events-*.ndjson > all_events_today.ndjson
```

---

## 3️⃣ Via Script de Consulta (Automatizado)

Vou criar um script para facilitar consultas comuns:

### Script: `query-events.sh`
```bash
#!/bin/bash
# workers/query-events.sh

BUCKET="operium-telemetry-raw"

# Função: Listar eventos de hoje
list_today() {
    echo "📅 Eventos de hoje: $(date +%Y-%m-%d)"
    npx wrangler r2 object list $BUCKET \
        --prefix "date=$(date +%Y-%m-%d)/" \
        | grep ".ndjson"
}

# Função: Baixar eventos de uma data específica
download_date() {
    local date=$1
    echo "⬇️  Baixando eventos de $date..."

    npx wrangler r2 object list $BUCKET \
        --prefix "date=$date/" \
        --json | jq -r '.objects[].key' | while read key; do

        npx wrangler r2 object get $BUCKET "$key" \
            --file "download-$(basename $key)"
        echo "  ✅ $(basename $key)"
    done

    # Combinar todos
    cat download-events-*.ndjson > "events-$date.ndjson" 2>/dev/null
    rm download-events-*.ndjson 2>/dev/null

    echo "📦 Arquivo consolidado: events-$date.ndjson"
}

# Função: Contar eventos por tipo
count_event_types() {
    local file=$1
    echo "📊 Contagem de eventos por tipo:"
    cat "$file" | jq -r '.event_name' | sort | uniq -c | sort -rn
}

# Função: Filtrar eventos por organização
filter_by_org() {
    local file=$1
    local org_id=$2
    echo "🔍 Eventos da organização: $org_id"
    cat "$file" | jq "select(.org_id == \"$org_id\")"
}

# Função: Estatísticas
stats() {
    local file=$1
    echo "📈 Estatísticas:"
    echo "  Total de eventos: $(cat "$file" | wc -l)"
    echo "  Organizações únicas: $(cat "$file" | jq -r '.org_id' | sort -u | wc -l)"
    echo "  Tipos de eventos únicos: $(cat "$file" | jq -r '.event_name' | sort -u | wc -l)"
    echo ""
    echo "📋 Top 5 eventos:"
    cat "$file" | jq -r '.event_name' | sort | uniq -c | sort -rn | head -5
}

# Menu
case "$1" in
    today)
        list_today
        ;;
    download)
        download_date "${2:-$(date +%Y-%m-%d)}"
        ;;
    count)
        count_event_types "$2"
        ;;
    filter)
        filter_by_org "$2" "$3"
        ;;
    stats)
        stats "$2"
        ;;
    *)
        echo "📚 Uso: $0 {today|download|count|filter|stats}"
        echo ""
        echo "Comandos:"
        echo "  today              - Listar arquivos de eventos de hoje"
        echo "  download [date]    - Baixar eventos de uma data (formato: YYYY-MM-DD)"
        echo "  count <file>       - Contar eventos por tipo"
        echo "  filter <file> <org> - Filtrar eventos por organização"
        echo "  stats <file>       - Mostrar estatísticas gerais"
        echo ""
        echo "Exemplos:"
        echo "  $0 today"
        echo "  $0 download 2025-12-26"
        echo "  $0 count events-2025-12-26.ndjson"
        echo "  $0 stats events-2025-12-26.ndjson"
        ;;
esac
```

---

## 4️⃣ Via Python (Análise Avançada)

### Script Python para análise
```python
# workers/analyze_events.py
import json
import sys
from collections import Counter
from datetime import datetime

def analyze_ndjson(filepath):
    """Analisa arquivo NDJSON de eventos"""
    events = []

    with open(filepath, 'r') as f:
        for line in f:
            events.append(json.loads(line))

    print(f"📊 Análise de {filepath}")
    print(f"Total de eventos: {len(events)}")
    print()

    # Por tipo de evento
    event_types = Counter(e['event_name'] for e in events)
    print("📋 Eventos por tipo:")
    for event_type, count in event_types.most_common():
        print(f"  {event_type}: {count}")
    print()

    # Por entidade
    entity_types = Counter(e['entity_type'] for e in events)
    print("🏷️  Eventos por entidade:")
    for entity_type, count in entity_types.most_common():
        print(f"  {entity_type}: {count}")
    print()

    # Por organização
    orgs = Counter(e['org_id'] for e in events)
    print(f"🏢 Organizações únicas: {len(orgs)}")
    print()

    # Timeline (primeiros e últimos)
    timestamps = sorted([e['ts'] for e in events])
    print(f"⏰ Período:")
    print(f"  Primeiro evento: {timestamps[0]}")
    print(f"  Último evento: {timestamps[-1]}")
    print()

    # Eventos com erro (se houver)
    errors = [e for e in events if e.get('props', {}).get('error')]
    if errors:
        print(f"⚠️  Eventos com erro: {len(errors)}")

    return events

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python analyze_events.py <arquivo.ndjson>")
        sys.exit(1)

    analyze_ndjson(sys.argv[1])
```

**Uso:**
```bash
cd /Users/macbookair/apps/operium/workers

# Baixar eventos
./query-events.sh download 2025-12-26

# Analisar
python analyze_events.py events-2025-12-26.ndjson
```

---

## 5️⃣ Consultas SQL (Futuro - Workers Analytics Engine)

Para análise em escala, você pode configurar o **Analytics Engine** do Cloudflare:

```sql
-- Exemplo de query (quando configurado)
SELECT
  event_name,
  COUNT(*) as total,
  COUNT(DISTINCT org_id) as orgs
FROM telemetry_events
WHERE ts >= NOW() - INTERVAL '24 HOURS'
GROUP BY event_name
ORDER BY total DESC
```

---

## 6️⃣ Monitoramento em Tempo Real

### Ver logs do Consumer Worker
```bash
cd /Users/macbookair/apps/operium/workers

# Tail dos logs do consumer (mostra eventos sendo processados)
npx wrangler tail operium-telemetry-consumer

# Tail do ingest
npx wrangler tail operium-telemetry-ingest
```

### Ver métricas da Queue
```bash
# Status da queue
npx wrangler queues list

# Detalhes (tamanho, throughput)
# Disponível no dashboard:
# https://dash.cloudflare.com/2767eff050e4e616bb74ec9b826a81c1/queues
```

---

## 7️⃣ Exemplos de Queries Úteis

### Buscar eventos de uma ferramenta específica
```bash
# Baixar eventos de hoje
./query-events.sh download $(date +%Y-%m-%d)

# Filtrar por entity_id
cat events-$(date +%Y-%m-%d).ndjson | \
  jq 'select(.entity_id == "TOOL_UUID_AQUI")'
```

### Contar movimentações por colaborador
```bash
cat events-2025-12-26.ndjson | \
  jq 'select(.event_name | startswith("MOVEMENT_")) | .props.recipient_id' | \
  sort | uniq -c | sort -rn
```

### Detectar padrões de atraso
```bash
# Eventos de devolução atrasada
cat events-2025-12-26.ndjson | \
  jq 'select(.event_name == "MOVEMENT_CHECKIN" and .props.late == true)'
```

### Exportar para CSV
```bash
cat events-2025-12-26.ndjson | \
  jq -r '[.ts, .event_name, .entity_type, .org_id] | @csv' > events.csv
```

---

## 🎯 Resumo dos Comandos Principais

```bash
# Listar eventos de hoje
npx wrangler r2 object list operium-telemetry-raw --prefix "date=$(date +%Y-%m-%d)/"

# Baixar arquivo específico
npx wrangler r2 object get operium-telemetry-raw "date=.../events-xxx.ndjson" --file events.ndjson

# Ver logs em tempo real
npx wrangler tail operium-telemetry-consumer

# Analisar arquivo local
cat events.ndjson | jq '.'
cat events.ndjson | jq '.event_name' | sort | uniq -c
```

---

## 📚 Recursos Adicionais

- **Dashboard Cloudflare**: https://dash.cloudflare.com
- **Docs R2 API**: https://developers.cloudflare.com/r2/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **jq Tutorial**: https://jqlang.github.io/jq/tutorial/

---

**Dica:** Para análises frequentes, considere criar um Worker que exponha uma API REST sobre o R2, ou integrar com ferramentas como **Grafana** ou **Metabase** via S3-compatible API do R2.
