# 📊 Operium - Análise de Dados e Observação

**Data:** 18/12/2024  
**Objetivo:** Validar e consolidar inteligência industrial existente

---

## 1. Mapeamento de Dados Coletados

### 1.1 Dados de Cadastro e Perfil

| Tabela | Campos | Classificação |
|--------|--------|---------------|
| `profiles` | name, company_name, cnpj, company_email, phone, industry_segment | Identidade |
| `profiles` | stripe_customer_id, subscription_status, trial_start_date | Comercial |
| `colaboradores` | nome, cargo, telefone, email, cpf, endereco, foto_url, data_admissao | Força de Trabalho |

### 1.2 Dados Operacionais (Eventos Reais)

| Tabela | Eventos Capturados | Volume |
|--------|-------------------|--------|
| `movimentacoes` | entrada, retirada, devolucao, ajuste, conserto | Alto |
| `consertos` | aguardando, em_andamento, concluido | Médio |
| `inventario_ajustes` | perda_avaria, furto_extravio, erro_lancamento, vencimento_descarte, transferencia | Baixo |
| `termos_responsabilidade` | assinatura digital, comprovação | Médio |

### 1.3 Dados Comportamentais Implícitos (Derivados)

**Não coletamos novos dados.** Os sinais abaixo emergem do timestamp das operações existentes:

| Sinal | Fonte | Cálculo |
|-------|-------|---------|
| **Tempo de posse** | `movimentacoes.data` | `devolucao_at - retirada_at` |
| **Taxa de atraso** | `movimentacoes.data` | % ciclos > 48h |
| **Frequência de uso** | `movimentacoes.data` | Operações/semana |
| **Recorrência de falhas** | `consertos.data_envio` | Count + MTBF |
| **Divergência operacional** | `inventario_ajustes.diferenca` | Sum abs(diferenca) |

### 1.4 Dados de Contexto

| Campo | Fonte | Valor Estratégico |
|-------|-------|-------------------|
| `industry_segment` | `profiles` | Benchmarking por setor |
| `categoria` | `ferramentas` | Clusters de ativos |
| `cargo` | `colaboradores` | Padrões por função |

---

## 2. Sinais Estratégicos JÁ Existentes

### 2.1 Camada Observer (Migrations 025-028)

O sistema **já possui** uma arquitetura analítica completa:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEMA: analytics                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │  events_log     │  ← Stream unificado de eventos            │
│  │  (VIEW 025)     │    movimentacoes + consertos +            │
│  └────────┬────────┘    inventario_ajustes + termos            │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              VIEWS ANALÍTICAS (026)                     │    │
│  ├──────────────────┬─────────────────┬──────────────────┐│    │
│  │ asset_usage_     │ collaborator_   │ asset_health_    ││    │
│  │ metrics          │ behavior        │ score            ││    │
│  │ (ciclos/tempo)   │ (atrasos/vol)   │ (repairs/MTBF)   ││    │
│  └──────────────────┴─────────────────┴──────────────────┘│    │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               MEMORY LAYER (028)                        │    │
│  ├──────────────────┬─────────────────┬──────────────────┐│    │
│  │ memory_          │ memory_         │ memory_          ││    │
│  │ collaborators    │ assets          │ organization     ││    │
│  │ (trust level)    │ (health status) │ (maturity stage) ││    │
│  └──────────────────┴─────────────────┴──────────────────┘│    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Sinais Prontos para Uso

| Sinal | View | Campo | Interpretação |
|-------|------|-------|---------------|
| **Tempo médio de uso** | `asset_usage_metrics` | `avg_hours_per_cycle` | Ativos com alto tempo = desgaste |
| **Taxa de retenção longa** | `collaborator_behavior` | `long_retention_rate` | > 0.3 = hoarding de ferramentas |
| **Nível de confiança** | `memory_collaborators` | `trust_level` | LOW/MEDIUM/HIGH_TRUST |
| **Saúde do ativo** | `asset_health_score` | `health_status` | GOOD/WARNING/CRITICAL |
| **MTBF** | `asset_health_score` | `avg_days_between_repairs` | Dias entre consertos |
| **Maturidade operacional** | `memory_organization` | `operational_maturity_stage` | NOVICE/DEVELOPING/OPTIMIZED |
| **Divergência acumulada** | `inventory_divergence_heatmap` | `total_items_diverged` | Perdas por categoria |

### 2.3 Signal Types (Classificação Semântica)

O sistema já categoriza eventos automaticamente:

| Signal Type | Significado |
|-------------|-------------|
| `OPERATION` | Evento neutro normal |
| `CORRECTION` | Erro operacional corrigido |
| `DEGRADATION` | Desgaste de ativo (conserto com custo) |
| `DIVERGENCE` | Divergência sistema vs realidade |
| `COMPLIANCE` | Formalização legal (termo assinado) |

---

## 3. Por Que Os Dados Atuais São Suficientes

### 3.1 Moat de Dados (Data Equity)

**Definição:** Vantagem competitiva derivada de dados únicos e difíceis de replicar.

#### A. Dados de Timestamp São Ouro

Cada operação registrada automaticamente captura:
- **Quando** aconteceu (pattern de horários)
- **Intervalo** entre eventos (velocidade operacional)
- **Sequência** de ações (workflow real)

> Um competidor precisaria de meses ou anos de uso para construir a mesma base histórica.

#### B. Multi-Tenancy Gera Benchmark Setorial

Com `industry_segment` no perfil, podemos comparar:
- Tempo médio de posse: Construção vs Manufatura
- Taxa de divergência: Logística vs Serviços
- MTBF por categoria de ferramenta: cross-industry

> Esse benchmark setorial é impossível de replicar sem escala de clientes.

#### C. Granularidade Colaborador-Ativo

O link entre `colaborador_id` e `ferramenta_id` em cada movimentação permite:
- Identificar qual colaborador "quebra" mais ferramentas
- Quais ativos são mais "disputados"
- Padrões de responsabilidade por cargo

> Esse nível de granularidade não existe em ERPs genéricos.

### 3.2 Memória Operacional Industrial

O conceito de **Memory Layer** (028) transforma dados transacionais em perfis persistentes:

```
Transação Isolada → Agregação Temporal → Perfil Comportamental → Previsão
     (evento)         (view analytics)      (memory_*)           (futuro)
```

**Exemplos concretos:**

1. **Colaborador com `trust_level = LOW_TRUST`**:
   - Pode ser notificado automaticamente sobre prazos
   - Gerente recebe alerta de risco

2. **Ativo com `health_status = CRITICAL`**:
   - Pode ser sugerido para aposentadoria
   - ROI calculado automaticamente

3. **Organização com `operational_maturity = OPTIMIZED`**:
   - Candidata a case study
   - Pricing diferenciado

---

## 4. Conclusão

### O Que Já Existe

✅ Stream unificado de eventos (`analytics.events_log`)  
✅ Métricas de ciclo de uso por ativo  
✅ Scoring comportamental de colaboradores  
✅ Health score de ativos com MTBF  
✅ Heatmap de divergência por categoria  
✅ Memory layer para colaboradores, ativos e organizações  
✅ Segmentação por industry para benchmarking  

### O Que NÃO Precisamos Adicionar

❌ Tracking de cliques/pageviews (invasivo, sem valor operacional)  
❌ Dados de localização GPS (fora do escopo)  
❌ Dados biométricos (desnecessário)  
❌ Integrações com redes sociais (irrelevante)  

### Moat Summary

| Dimensão | Moat |
|----------|------|
| **Volume** | Cada operação adiciona ao histórico |
| **Tempo** | Meses de uso = impossível replicar |
| **Granularidade** | Colaborador ↔ Ativo ↔ Tempo |
| **Contexto** | Industry segment para benchmark |
| **Semântica** | Signal types classificam automaticamente |

---

**Veredicto:** Os dados atuais são suficientes para construir memória operacional industrial.  
O Observer Layer (025-028) já transforma operações em inteligência.  
Nenhum dado novo é necessário — apenas uso estratégico do que já existe.
