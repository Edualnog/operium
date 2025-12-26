#!/usr/bin/env python3
"""
============================================================================
Análise de Eventos - Telemetria Operium
============================================================================
Analisa arquivos NDJSON de eventos e gera estatísticas.

Uso:
    python analyze_events.py <arquivo.ndjson>
============================================================================
"""

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime

def parse_timestamp(ts_str):
    """Converte timestamp ISO para datetime"""
    return datetime.fromisoformat(ts_str.replace('Z', '+00:00'))

def analyze_ndjson(filepath):
    """Analisa arquivo NDJSON de eventos"""
    print(f"📂 Carregando: {filepath}")

    events = []
    with open(filepath, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"⚠️  Erro na linha {line_num}: {e}")

    print(f"✅ Carregados {len(events)} eventos\n")

    if not events:
        print("❌ Nenhum evento encontrado")
        return []

    # === ESTATÍSTICAS GERAIS ===
    print("=" * 70)
    print("📊 ESTATÍSTICAS GERAIS")
    print("=" * 70)
    print(f"Total de eventos: {len(events)}")

    # Organizações
    orgs = set(e['org_id'] for e in events)
    print(f"Organizações únicas: {len(orgs)}")

    # Tipos de entidade
    entity_types = set(e['entity_type'] for e in events)
    print(f"Tipos de entidade: {len(entity_types)}")

    # Tipos de evento
    event_types = set(e['event_name'] for e in events)
    print(f"Tipos de evento: {len(event_types)}")

    # Timeline
    timestamps = sorted([parse_timestamp(e['ts']) for e in events])
    print(f"\n⏰ Período:")
    print(f"  Primeiro evento: {timestamps[0]}")
    print(f"  Último evento:   {timestamps[-1]}")
    print(f"  Duração: {timestamps[-1] - timestamps[0]}")

    # === EVENTOS POR TIPO ===
    print(f"\n{'=' * 70}")
    print("📋 EVENTOS POR TIPO")
    print("=" * 70)
    event_counts = Counter(e['event_name'] for e in events)
    for event_type, count in event_counts.most_common():
        percentage = (count / len(events)) * 100
        print(f"  {event_type:<30} {count:>5} ({percentage:>5.1f}%)")

    # === EVENTOS POR ENTIDADE ===
    print(f"\n{'=' * 70}")
    print("🏷️  EVENTOS POR ENTIDADE")
    print("=" * 70)
    entity_counts = Counter(e['entity_type'] for e in events)
    for entity_type, count in entity_counts.most_common():
        percentage = (count / len(events)) * 100
        print(f"  {entity_type:<30} {count:>5} ({percentage:>5.1f}%)")

    # === EVENTOS POR ORGANIZAÇÃO ===
    print(f"\n{'=' * 70}")
    print("🏢 EVENTOS POR ORGANIZAÇÃO")
    print("=" * 70)
    org_counts = Counter(e['org_id'] for e in events)
    for org_id, count in org_counts.most_common(10):  # Top 10
        percentage = (count / len(events)) * 100
        org_short = org_id[:8] + "..." if len(org_id) > 8 else org_id
        print(f"  {org_short:<30} {count:>5} ({percentage:>5.1f}%)")

    # === EVENTOS POR HORA ===
    print(f"\n{'=' * 70}")
    print("⏱️  DISTRIBUIÇÃO POR HORA DO DIA")
    print("=" * 70)
    hour_counts = Counter(parse_timestamp(e['ts']).hour for e in events)
    for hour in sorted(hour_counts.keys()):
        count = hour_counts[hour]
        bar = '█' * (count // max(1, len(events) // 50))  # Bar chart
        print(f"  {hour:02d}:00 | {bar} {count}")

    # === FLUXOS MAIS COMUNS ===
    print(f"\n{'=' * 70}")
    print("🔄 FLUXOS MAIS COMUNS")
    print("=" * 70)
    flows = Counter(e.get('context', {}).get('flow') for e in events if e.get('context', {}).get('flow'))
    if flows:
        for flow, count in flows.most_common(10):
            print(f"  {flow:<30} {count:>5}")
    else:
        print("  (nenhum fluxo registrado)")

    # === ANÁLISE DE PROPRIEDADES ===
    print(f"\n{'=' * 70}")
    print("🔍 PROPRIEDADES MAIS COMUNS")
    print("=" * 70)
    all_props = defaultdict(Counter)
    for event in events:
        for key, value in event.get('props', {}).items():
            if isinstance(value, (str, int, float, bool)):
                all_props[key][str(value)] += 1

    for prop_key in sorted(all_props.keys())[:10]:  # Top 10 propriedades
        print(f"\n  {prop_key}:")
        for value, count in all_props[prop_key].most_common(5):
            value_short = (value[:40] + "...") if len(value) > 40 else value
            print(f"    - {value_short:<40} {count:>4}x")

    # === VERIFICAÇÕES DE QUALIDADE ===
    print(f"\n{'=' * 70}")
    print("✅ VERIFICAÇÕES DE QUALIDADE")
    print("=" * 70)

    # Eventos sem entity_id
    no_entity_id = sum(1 for e in events if not e.get('entity_id'))
    if no_entity_id:
        print(f"  ⚠️  Eventos sem entity_id: {no_entity_id}")

    # Eventos sem actor_id
    no_actor = sum(1 for e in events if not e.get('actor_id'))
    if no_actor:
        print(f"  ⚠️  Eventos sem actor_id: {no_actor}")

    # PII warnings
    pii_events = sum(1 for e in events if e.get('privacy', {}).get('contains_pii'))
    if pii_events:
        print(f"  ⚠️  ATENÇÃO: {pii_events} eventos marcados com PII!")

    # Duplicatas potenciais (mesmo event_id)
    event_ids = [e['event_id'] for e in events]
    duplicates = len(event_ids) - len(set(event_ids))
    if duplicates:
        print(f"  ⚠️  Possíveis duplicatas: {duplicates}")

    if not (no_entity_id or no_actor or pii_events or duplicates):
        print("  ✅ Nenhum problema detectado!")

    print("\n" + "=" * 70)

    return events

def main():
    if len(sys.argv) < 2:
        print("Uso: python analyze_events.py <arquivo.ndjson>")
        print("\nExemplo:")
        print("  python analyze_events.py events-2025-12-26.ndjson")
        sys.exit(1)

    filepath = sys.argv[1]

    try:
        analyze_ndjson(filepath)
    except FileNotFoundError:
        print(f"❌ Arquivo não encontrado: {filepath}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro ao processar arquivo: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
