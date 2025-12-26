# Operium

## 1. Visão Geral da Plataforma

**Operium é uma plataforma de observabilidade operacional que transforma eventos do dia a dia de empresas industriais em inteligência estruturada.**

A plataforma resolve um problema central: empresas operacionais — construção civil, manufatura, logística, serviços de campo — perdem controle sobre ativos, colaboradores e processos porque não conseguem enxergar o que realmente acontece no dia a dia. Operium captura cada movimentação, cada conserto, cada ajuste de inventário e transforma esses eventos em memória operacional estruturada.

Operium existe para empresas que precisam de controle operacional real, não de mais um sistema genérico de gestão.

---

## 2. Objetivo do Repositório

Este é o **repositório principal da plataforma Operium** — contém a aplicação completa desenvolvida com Next.js 14, Supabase e Shadcn UI.

**Responsabilidades deste repositório:**
- Frontend completo (interface do usuário, dashboards, formulários)
- Backend via Supabase (autenticação, banco de dados, Row Level Security)
- Server Actions para operações críticas
- **Sistema de Telemetria Industrial** (23 eventos em tempo real)
- Multi-tenancy com isolamento total por organização

**Relação com outros componentes:**
- Conecta-se ao **Supabase** para dados transacionais (hot data)
- Envia eventos para **Cloudflare Workers** (telemetria em tempo real)
- Armazena eventos no **Cloudflare R2** (cold data, análise histórica)
- Utiliza GitHub Actions para automação de deploys

---

## 3. Arquitetura de Alto Nível

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────────┐
│                         OPERIUM PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  FRONTEND (Next.js 14 + Shadcn UI)                       │  │
│  │  - Dashboard de KPIs                                      │  │
│  │  - Gestão de Colaboradores                                │  │
│  │  - Gestão de Ferramentas e Ativos                         │  │
│  │  - Gestão de Equipes                                      │  │
│  │  - Sistema de Consertos                                   │  │
│  │  - Movimentações e Auditoria                              │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  BACKEND / API (Supabase + Server Actions)               │  │
│  │  - Autenticação (email/password + Google OAuth)          │  │
│  │  - Row Level Security (RLS) por org_id                    │  │
│  │  - Server Actions para operações críticas                 │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  BANCO TRANSACIONAL (Supabase / Postgres)                │  │
│  │  - profiles, colaboradores, ferramentas                   │  │
│  │  - movimentacoes, consertos, teams                        │  │
│  │  - domain_events (stream unificado de eventos)            │  │
│  │  - RLS aplicado em todas as tabelas                       │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                          │
│                       │ (dados ativos - hot data)                │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        │ (eventos > 60 dias)
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  DATA PIPELINE (GitHub Actions)  │
         │  - Exporta eventos históricos    │
         │  - Marca como archived           │
         └──────────────┬───────────────────┘
                        │
                        │ (formato Parquet)
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  DATA LAKE (Cloudflare R2)       │
         │  - Histórico imutável            │
         │  - Particionado por data/perfil  │
         │  - Formato analítico (Parquet)   │
         └──────────────────────────────────┘
```

### Separação de Responsabilidades

- **Supabase (Postgres)**: Dados operacionais ativos — últimos 60 dias de eventos, dados mestre (colaboradores, ferramentas), dados transacionais (movimentações, consertos). Otimizado para leitura/escrita rápida.

- **Cloudflare R2**: Dados históricos imutáveis — eventos com mais de 60 dias, formato Parquet otimizado para análise. Armazenamento infinito, custo baixo, base para inteligência futura.

- **GitHub Actions**: Orquestração de pipeline — executa exportação diária de eventos antigos do Supabase para o R2, mantém o banco principal performático.

---

## 4. Fluxo Principal de Dados

O fluxo de dados na plataforma Operium segue uma arquitetura event-driven com separação clara entre dados quentes e frios:

### Passo a Passo

1. **Usuário executa ações na plataforma**  
   - Retira uma ferramenta, devolve um ativo, abre uma ordem de conserto, cria um ajuste de inventário, assina um termo de responsabilidade.

2. **Eventos de domínio são gerados automaticamente**  
   - Toda operação crítica gera um registro na tabela `public.domain_events` com payload completo, timestamp e metadados.

3. **Dados ativos permanecem no Supabase**  
   - Últimos 60 dias de eventos ficam no banco principal para queries rápidas e dashboards em tempo real.

4. **Eventos históricos são exportados automaticamente**  
   - Pipeline executado diariamente via GitHub Actions (`operium-data-pipeline`) identifica eventos com mais de 60 dias.

5. **Dados históricos são armazenados no R2 em formato Parquet**  
   - Eventos exportados são convertidos para Parquet (formato colunar otimizado), particionados por data e `profile_id`, e enviados para o Cloudflare R2.

6. **O banco principal permanece leve e performático**  
   - Eventos antigos são marcados como `archived = true` mas **nunca deletados** (imutabilidade). O banco transacional foca no presente, o data lake guarda o passado.

### Resultado

- **Performance**: Dashboard sempre rápido, queries eficientes
- **Escalabilidade**: Crescimento ilimitado sem degradação
- **Auditoria**: Histórico completo e imutável
- **Inteligência Futura**: Base de dados estruturada pronta para análise cross-tenant, benchmarks industriais e aprendizado de máquina

---

## 5. Filosofia de Design

A arquitetura da Operium é guiada por princípios fundamentais que a diferenciam de ERPs tradicionais:

### Event-Driven Architecture (Telemetria Industrial)

Toda operação significativa gera um **evento de telemetria imutável**. Cobertura completa dos eventos operacionais críticos definidos no domínio:
- 🔧 Assets/Ferramentas (criar, editar, deletar)
- 👷 Colaboradores/RH (contratar, promover, demitir)
- 📦 Movimentações (entrada, retirada, devolução)
- 🔨 Consertos (envio, status, retorno com custo)
- 👥 Times/Gestão (criar equipes, adicionar membros)
- 🚚 Equipamentos (atribuir, devolver, perda/dano)

> **Princípio**: Eventos são a verdade. Estados são derivados. A telemetria não controla o produto — ela observa.

**📊 Documentação completa:** [TELEMETRY_GUIDE.md](TELEMETRY_GUIDE.md) - Guia para investidores e programadores

### Separação entre Operação e Análise

**Método de coleta de dados:**
- **Backend (Next.js)** → Operação transacional (PostgreSQL/Supabase)
- **Telemetria (Cloudflare Workers)** → Eventos em tempo real (R2 Storage)
- **Zero impacto:** Fire-and-forget - o produto não aguarda, não depende e não reage à telemetria
- **Tolerância a falhas:** Timeout de 700ms é limite de observação, não requisito funcional
- **Escalável:** Cloudflare Edge (global, 99.99% uptime)
- **Baixo custo:** ~$11/mês para 1 milhão de eventos

> **Princípio**: Hot data vs Cold data. Operação no presente, inteligência no histórico.

**Arquitetura:**
```
Backend → Cloudflare Worker (Ingest) → Queue → Worker (Consumer) → R2 Storage
                                                                     ↓
                                                            Business Intelligence
                                                            (Grafana/Metabase/SQL)
```

### Escalabilidade, Não Features Descartáveis

Cada decisão técnica prioriza a capacidade de crescer sem refatoração. Não construímos features isoladas — construímos infraestrutura que suporta inteligência futura.

> **Princípio**: A plataforma deve aprender com o uso sem precisar ser reconstruída.

### Observer Doctrine (Assimetria Informacional)

A plataforma observa mais do que mostra. Scores internos de confiança, perfis comportamentais e análises preditivas existem na camada analítica, mas não são expostos diretamente ao usuário.

> **Princípio**: Feedback sintomático, não estatísticas cruas. Preservar governança e controle dos dados.

📖 **Referência completa**: [`OBSERVER_DOCTRINE.md`](./OBSERVER_DOCTRINE.md)

---

## 6. Valor para o Usuário

Operium resolve problemas operacionais reais do dia a dia de empresas industriais:

### Menos Perda

- **Rastreamento completo**: Saber onde está cada ativo, quem está usando, desde quando
- **Histórico imutável**: Auditoria completa de movimentações, impossível apagar rastros
- **Alertas preventivos**: Identificação de colaboradores com retenção prolongada de ativos

### Mais Controle

- **Visibilidade operacional**: Dashboard em tempo real com KPIs relevantes (disponibilidade, taxa de consertos, movimentações)
- **Gestão de equipes**: Organizar colaboradores em times, alocar equipamentos e veículos, acompanhar localização (obra/projeto)
- **Termos de responsabilidade**: Formalização digital de entregas, comprovação legal

### Menos Atrito Operacional

- **Interface simples e rápida**: Ações principais (entrada, retirada, devolução, conserto) em poucos cliques
- **Mobile-first**: Funciona perfeitamente em tablets e celulares para uso em campo
- **Sem complexidade desnecessária**: Foco no essencial, sem sobrecarga de funcionalidades inúteis

### Decisões Melhores

- **Dados estruturados**: Base limpa para análises e relatórios customizados
- **Identificação de padrões**: Quais ativos quebram mais, quais colaboradores são mais cuidadosos, onde há gargalos
- **Benchmarking interno**: Comparar performance entre equipes, períodos ou categorias

---

## 7. Valor Estratégico (Investidor / Longo Prazo)

### A Plataforma Aprende com o Uso

Cada operação registrada adiciona um ponto no grafo comportamental da plataforma. Com o tempo, emergem padrões impossíveis de capturar manualmente:

- Tempo médio de posse por categoria de ativo e tipo de operação
- Frequência de consertos por marca/modelo/fornecedor
- Correlação entre comportamento de colaborador e desgaste de equipamento
- Padrões de perda por segmento industrial

### Dados Agregados Geram Inteligência Operacional

Com múltiplos tenants operando na plataforma, surge a capacidade de **benchmarking setorial anônimo**:

- Construção civil vs Manufatura: diferenças em MTBF (Mean Time Between Failures)
- Logística vs Serviços: padrões de retenção de ativos
- Identificação de outliers: empresas com performance excepcional ou crítica

> **Importante**: Dados são anonimizados e agregados. Nenhum cliente individual tem seus dados expostos.

### O Sistema Cria um Moat Baseado em Comportamento Real

A vantagem competitiva da Operium não está no software — está no **histórico longitudinal irreversível**:

- Competidores podem copiar features, mas não podem replicar anos de dados comportamentais
- Quanto mais tempo um cliente usa, mais valiosa a plataforma se torna (network effects internos)
- A memória operacional acumulada é exclusiva de cada organização, mas a inteligência agregada pertence à plataforma

### O Objetivo NÃO É Vender Dados

A estratégia não é monetizar dados de clientes. O valor está em:

1. **Produto cada vez melhor**: Usar inteligência agregada para criar features preditivas (alertas, recomendações)
2. **Moat defensivo**: Dificultar entrada de competidores via superioridade de dados
3. **Pricing baseado em valor**: Clientes maduros pagam mais porque extraem mais valor da memória histórica

📖 **Detalhes técnicos da camada analítica**: [`docs/DATA_INTELLIGENCE.md`](./docs/DATA_INTELLIGENCE.md)

---

## 8. Como Contribuir / Entender o Código

### Estrutura do Projeto

```
operium/
├── app/
│   ├── dashboard/              # Páginas principais do dashboard
│   │   ├── colaboradores/      # Gestão de colaboradores
│   │   ├── ferramentas/        # Gestão de ativos
│   │   ├── consertos/          # Ordens de conserto
│   │   ├── teams/              # Gestão de equipes
│   │   ├── movimentacoes/      # Histórico de movimentações
│   │   ├── relatorios/         # Relatórios analíticos
│   │   ├── blackbox/           # Observer Layer (interno)
│   │   └── page.tsx            # Dashboard principal (KPIs)
│   ├── auth/                   # Autenticação (login, signup, password)
│   ├── landing/                # Landing page pública
│   ├── layout.tsx              # Layout raiz
│   └── globals.css             # Estilos globais
├── components/
│   ├── ui/                     # Componentes Shadcn UI
│   ├── layout/                 # Sidebar, Header, Footer
│   ├── dashboard/              # Cards de KPIs, gráficos
│   ├── colaboradores/          # Componentes específicos de colaboradores
│   ├── ferramentas/            # Componentes específicos de ferramentas
│   ├── teams/                  # Componentes de gestão de equipes
│   └── onboarding/             # Tutorial inicial
├── lib/
│   ├── supabase-client.ts      # Cliente Supabase (Client Components)
│   ├── supabase-server.ts      # Cliente Supabase (Server Components)
│   ├── actions.ts              # Server Actions
│   ├── utils.ts                # Utilitários gerais
│   └── emitDomainEvent.ts      # Emissor de eventos de domínio
├── supabase/
│   └── migrations/             # Migrations SQL do Supabase
│       ├── 001-025_*           # Schema core + tabelas principais
│       ├── 026_*               # Observer Layer (analytics schema)
│       ├── 027_*               # Memory Layer
│       └── 028_*               # Domain Events
├── scripts/
│   └── observer/               # Scripts de análise interna
└── middleware.ts               # Middleware de autenticação
```

### Onde Está a Lógica Principal

- **Eventos de domínio**: `lib/emitDomainEvent.ts` + tabela `public.domain_events`
- **Observer Layer**: Migrations `025-028` (analytics schema), views materializadas
- **Server Actions**: `lib/actions.ts` (operações críticas do backend)
- **RLS Policies**: `supabase/migrations/*_rls.sql` (segurança multi-tenant)
- **Dashboards**: `app/dashboard/page.tsx` + `components/dashboard/*`

### Padrões de Nomenclatura

- **Tabelas principais**: `colaboradores`, `ferramentas`, `movimentacoes`, `consertos`, `teams`
- **Schema analítico**: `analytics.*` (events_log, asset_usage_metrics, collaborator_behavior, memory_*)
- **Eventos**: `domain_events` com `event_type`, `entity_type`, `payload`, `occurred_at`
- **Multi-tenancy**: Toda tabela principal tem `profile_id` ou `org_id` com RLS ativo

### Como Rodar Localmente

#### Pré-requisitos

- Node.js 18+
- Conta no Supabase (gratuita)
- npm ou yarn

#### Passos

1. **Clone o repositório**
   ```bash
   git clone <seu-repositorio>
   cd operium
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o Supabase**
   - Acesse [supabase.com](https://supabase.com) e crie um novo projeto
   - No SQL Editor, execute as migrations em ordem (`supabase/migrations/`)
   - Configure Google OAuth (se necessário): veja [`CONFIGURAR_GOOGLE_AUTH.md`](./CONFIGURAR_GOOGLE_AUTH.md)

4. **Configure as variáveis de ambiente**
   
   Crie `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

5. **Execute o projeto**
   ```bash
   npm run dev
   ```
   
   Acesse [http://localhost:3000](http://localhost:3000)

📖 **Guia completo de setup**: [`SETUP.md`](./SETUP.md)

### Como Contribuir

1. **Entenda a Observer Doctrine** antes de propor mudanças: [`OBSERVER_DOCTRINE.md`](./OBSERVER_DOCTRINE.md)
2. **Preserve a imutabilidade dos eventos**: Nunca deletar dados históricos
3. **Mantenha RLS ativo**: Todo dado deve respeitar multi-tenancy
4. **Emita eventos de domínio**: Operações críticas devem gerar eventos via `emitDomainEvent()`
5. **Teste localmente**: Valide que RLS funciona corretamente com múltiplos perfis

---

## 9. Status Atual e Próximos Passos

### ✅ Em Produção

- **Core Platform**: Dashboard, colaboradores, ferramentas, consertos, movimentações
- **Gestão de Equipes**: Teams, alocação de equipamentos/veículos, tracking de locais
- **Multi-tenancy**: RLS completo, isolamento por organização
- **Autenticação**: Email/password + Google OAuth
- **Observer Layer**: Analytics schema, eventos de domínio, memory layer
- **Data Pipeline**: Exportação automática diária para R2 (últimos 60+ dias)
- **Internacionalização**: Português e Inglês
- **Mobile-first**: Interface totalmente responsiva

### 🚀 Roadmap de Curto Prazo

- **Relatórios Customizados**: Exportação PDF, filtros avançados
- **Notificações Inteligentes**: Alertas baseados em comportamento (atrasos, retenção prolongada)
- **Gestão de Fornecedores**: Tracking de manutenções externas, comparação de custos
- **Integrações Básicas**: Webhooks para sistemas externos

### 🔮 Roadmap de Longo Prazo

- **Benchmarking Setorial**: Comparação anônima com empresas similares
- **Previsão de Falhas**: ML leve para sugerir manutenção preventiva
- **Análise de ROI por Ativo**: Calcular custo total de propriedade automaticamente
- **API Pública**: Permitir integrações customizadas

### ❌ NÃO É Prioridade

- **IA generativa pesada**: Foco em dados estruturados, não em chat/NLP complexo
- **Marketplace de fornecedores**: Platform play não é o objetivo
- **Features de comunicação interna**: Não competir com Slack/Teams
- **ERP completo**: Foco em observabilidade operacional, não em substituir SAP

---

## 🔧 Tecnologias Utilizadas

- **Next.js 14**: Framework React com App Router, Server Components, Server Actions
- **Supabase**: Backend-as-a-Service (Postgres, Auth, RLS, Realtime)
- **Tailwind CSS**: Utilitário CSS para estilização rápida
- **Shadcn UI**: Componentes UI acessíveis e customizáveis
- **Framer Motion**: Animações declarativas
- **Recharts**: Gráficos e visualizações interativas
- **Zod**: Validação de schemas
- **TypeScript**: Tipagem estática end-to-end
- **date-fns**: Manipulação de datas
- **jsPDF**: Geração de PDFs
- **Cloudflare R2**: Data lake para histórico (S3-compatible)

---

## 📚 Documentação Adicional

- [`SETUP.md`](./SETUP.md) — Guia detalhado de configuração do Supabase
- [`DEPLOY.md`](./DEPLOY.md) — Instruções de deploy (Vercel, Netlify, etc.)
- [`PERFORMANCE.md`](./PERFORMANCE.md) — Otimizações e métricas de performance
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — Solução de problemas comuns
- [`OBSERVER_DOCTRINE.md`](./OBSERVER_DOCTRINE.md) — Filosofia de dados e observação
- [`docs/DATA_INTELLIGENCE.md`](./docs/DATA_INTELLIGENCE.md) — Arquitetura Observer Layer e data equity
- [`CONFIGURAR_GOOGLE_AUTH.md`](./CONFIGURAR_GOOGLE_AUTH.md) — Setup de autenticação Google
- [`README_I18N.md`](./README_I18N.md) — Sistema de internacionalização

---

## 📝 Licença

Este projeto está sob a licença MIT.

---

## 📧 Suporte

Para dúvidas ou problemas, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.

---

**Operium** — Observabilidade operacional para empresas que constroem, produzem e entregam no mundo real.
