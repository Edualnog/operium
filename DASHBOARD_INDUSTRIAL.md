# Dashboard Industrial de Almoxarifado

## 📋 Visão Geral

Dashboard completo com 12 KPIs essenciais para gestão industrial de almoxarifado, incluindo ferramentas, consumíveis, EPIs e previsões.

## 🚀 Instalação e Configuração

### 1. Executar Migration SQL

Execute a migration `005_industrial_kpis.sql` no Supabase para adicionar os campos necessários:

```sql
-- Execute no SQL Editor do Supabase
-- Arquivo: supabase/migrations/005_industrial_kpis.sql
```

Esta migration adiciona:
- Campos `prazo_devolucao`, `saida_at`, `devolucao_at` na tabela `movimentacoes`
- Campos `ponto_ressuprimento`, `lead_time_dias`, `validade`, `tipo_item` na tabela `ferramentas`
- Funções SQL para cálculos de KPIs
- Índices para performance

### 2. Configurar Tipos de Itens

Ao cadastrar ferramentas, defina o campo `tipo_item`:
- `'ferramenta'` - Ferramentas reutilizáveis
- `'consumivel'` - Itens consumíveis
- `'epi'` - Equipamentos de Proteção Individual

### 3. Configurar Campos Opcionais

Para KPIs mais precisos, configure:
- **Ponto de Ressuprimento (PRD)**: Quantidade mínima que dispara alerta
- **Lead Time**: Tempo médio de reposição em dias
- **Validade**: Data de validade (principalmente para EPIs)
- **Prazo de Devolução**: Prazo limite para devolução de ferramentas

## 📊 KPIs Implementados

### Ferramentas

1. **Ferramentas em Uso Agora**
   - Contagem de ferramentas com saída registrada e sem devolução

2. **Tempo Médio de Retorno (TMR)**
   - Média de horas entre saída e devolução
   - Calculado via função SQL `calcular_tmr()`

3. **Índice de Atraso de Devolução**
   - Percentual de devoluções após prazo limite
   - Calculado via função SQL `calcular_indice_atraso()`

4. **Top Ferramentas Mais Utilizadas**
   - Ranking baseado em saídas dos últimos 30 dias

5. **Ranking de Responsabilidade dos Colaboradores**
   - Score = (Devoluções no prazo / Total de retiradas) * 100
   - Calculado via função SQL `calcular_score_responsabilidade()`

### Consumíveis

6. **Consumo Médio Diário (30 dias)**
   - Média de unidades consumidas por dia

7. **Itens com Estoque Crítico**
   - Itens com `quantidade_disponivel < ponto_ressuprimento`

8. **Itens com Maior Consumo Recente**
   - Ranking de consumíveis com maior saída (30 dias)

### EPIs

9. **EPIs Ativos por Colaborador**
   - Quantidade de EPIs atualmente atribuídos
   - Calculado comparando retiradas vs devoluções

10. **EPIs Próximos da Validade**
    - Itens com validade em até 30 dias

### Previsões

11. **Risco de Ruptura (Score 0-100)**
    - Score = (Consumo médio diário * lead time) / estoque atual * 100
    - Calculado via função SQL `calcular_risco_ruptura()`

12. **Itens Críticos do Dia**
    - Combinação de:
      - Estoque crítico
      - EPIs próximos da validade
      - Alto risco de ruptura

## 🎨 Componentes

### `IndustrialDashboard`
Componente principal que renderiza todos os KPIs organizados por seções.

### `useKPIs` Hook
Hook customizado que:
- Busca todos os dados necessários
- Calcula KPIs complexos
- Retorna dados formatados e tipados

### `KpiList`
Componente para exibir listas de itens com colunas customizáveis.

### `KpiChart`
Componente para gráficos (bar, line, area) usando Recharts.

## 📝 Exemplo de Uso

```tsx
import { IndustrialDashboard } from "@/components/dashboard/IndustrialDashboard"

export default function DashboardPage() {
  const { data: { user } } = await supabase.auth.getUser()
  
  return <IndustrialDashboard userId={user.id} />
}
```

## 🔧 Funções SQL Criadas

### `calcular_tmr(p_profile_id UUID)`
Retorna o tempo médio de retorno em horas.

### `calcular_indice_atraso(p_profile_id UUID)`
Retorna o percentual de devoluções atrasadas.

### `calcular_score_responsabilidade(p_profile_id UUID, p_colaborador_id UUID)`
Retorna o score de responsabilidade do colaborador (0-100).

### `calcular_risco_ruptura(p_profile_id UUID, p_ferramenta_id UUID)`
Retorna o score de risco de ruptura (0-100).

## ⚡ Performance

- Queries otimizadas com índices
- Uso de `Promise.all` para paralelização
- Cache com `revalidate = 60` segundos
- Lazy loading de componentes pesados

## 🎯 Próximos Passos

1. Execute a migration SQL no Supabase
2. Configure os campos `tipo_item` nas ferramentas existentes
3. Adicione `ponto_ressuprimento` e `lead_time_dias` conforme necessário
4. Configure `validade` para EPIs
5. Use `prazo_devolucao` ao registrar retiradas de ferramentas

## 📚 Estrutura de Arquivos

```
lib/
  hooks/
    useKPIs.ts          # Hook principal para KPIs
  types/
    kpis.ts             # Tipos TypeScript

components/
  dashboard/
    IndustrialDashboard.tsx  # Dashboard principal
    KpiList.tsx              # Componente de lista
    KpiChart.tsx             # Componente de gráfico
    KPICard.tsx              # Card de KPI (já existente)

supabase/
  migrations/
    005_industrial_kpis.sql   # Migration SQL
```

## 🐛 Troubleshooting

### Erro: "function calcular_tmr does not exist"
Execute a migration `005_industrial_kpis.sql` no Supabase.

### KPIs retornando 0 ou vazios
Verifique se:
- Os dados estão sendo registrados corretamente
- Os campos `tipo_item` estão configurados
- As movimentações têm `saida_at` e `devolucao_at` quando aplicável

### Performance lenta
- Verifique se os índices foram criados
- Considere aumentar o `revalidate` para cache mais longo
- Use `Suspense` para lazy loading

