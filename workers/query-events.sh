#!/bin/bash

# ============================================================================
# Script de Consulta de Eventos - Telemetria Operium
# ============================================================================
# Facilita download e análise de eventos armazenados no R2
# ============================================================================

BUCKET="operium-telemetry-raw"

# Função: Listar eventos de hoje
list_today() {
    echo "📅 Eventos de hoje: $(date +%Y-%m-%d)"
    npx wrangler r2 object list \
        --bucket $BUCKET \
        --prefix "date=$(date +%Y-%m-%d)/" \
        | grep ".ndjson"
}

# Função: Baixar eventos de uma data específica
download_date() {
    local date=$1
    echo "⬇️  Baixando eventos de $date..."

    npx wrangler r2 object list \
        --bucket $BUCKET \
        --prefix "date=$date/" \
        --json | jq -r '.objects[].key' | while read key; do

        npx wrangler r2 object get \
            --bucket $BUCKET \
            --file "download-$(basename $key)" \
            "$key"
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
