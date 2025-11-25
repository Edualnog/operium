# Almox Fácil

Plataforma completa de gestão de almoxarifado multi-tenant desenvolvida com Next.js 14, Supabase, Tailwind CSS e Shadcn UI.

## 🚀 Características

- **Multi-tenant**: Cada usuário possui seu próprio almoxarifado isolado
- **Dashboard completo**: KPIs, gráficos e métricas em tempo real
- **Gestão de Colaboradores**: CRUD completo com busca e paginação
- **Gestão de Ferramentas**: Controle de estoque com ações rápidas (entrada, retirada, devolução, conserto)
- **Sistema de Consertos**: Rastreamento completo de ordens de conserto
- **Movimentações**: Histórico completo de todas as operações
- **Design Moderno**: Interface elegante com sidebar animado inspirado no Linear/Apple
- **Sidebar Inteligente**: Expande/contrai no hover com animações suaves
- **Responsivo**: Menu mobile com animações
- **Otimizado**: Performance otimizada com queries eficientes e memoização
- **Segurança**: Row Level Security (RLS) no Supabase garantindo isolamento de dados

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase (gratuita)

## 🛠️ Instalação

### 1. Clone o repositório

```bash
git clone <seu-repositorio>
cd erp-almox-facil
```

### 2. Instale as dependências

```bash
npm install
# ou
yarn install
```

### 3. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. No painel do Supabase, vá em **SQL Editor**
3. Execute o arquivo de migration: `supabase/migrations/001_initial_schema.sql`
4. Copie as credenciais do seu projeto:
   - URL do projeto
   - Chave anônima (anon key)

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 5. Execute o projeto

```bash
npm run dev
# ou
yarn dev
```

O projeto estará disponível em [http://localhost:3000](http://localhost:3000)

## 📦 Estrutura do Projeto

```
erp-almox-facil/
├── app/
│   ├── dashboard/          # Páginas do dashboard
│   │   ├── colaboradores/  # Gestão de colaboradores
│   │   ├── ferramentas/    # Gestão de ferramentas
│   │   ├── consertos/      # Gestão de consertos
│   │   └── page.tsx        # Dashboard principal
│   ├── login/              # Página de login
│   ├── layout.tsx          # Layout raiz
│   └── globals.css         # Estilos globais
├── components/
│   ├── ui/                 # Componentes Shadcn UI + Sidebar animado
│   ├── layout/             # Componentes de layout
│   ├── dashboard/          # Componentes do dashboard
│   ├── colaboradores/      # Componentes de colaboradores
│   ├── ferramentas/        # Componentes de ferramentas
│   └── consertos/          # Componentes de consertos
├── lib/
│   ├── supabase-client.ts # Cliente Supabase (Client Components)
│   ├── supabase-server.ts # Cliente Supabase (Server Components)
│   ├── actions.ts         # Server Actions
│   └── utils.ts           # Utilitários
├── supabase/
│   └── migrations/         # Migrations SQL
└── middleware.ts          # Middleware de autenticação
```

## 🗄️ Banco de Dados

O sistema utiliza as seguintes tabelas:

- **profiles**: Perfis de usuários
- **colaboradores**: Colaboradores do almoxarifado
- **ferramentas**: Ferramentas em estoque
- **movimentacoes**: Histórico de movimentações
- **consertos**: Ordens de conserto

Todas as tabelas possuem Row Level Security (RLS) configurada para garantir que cada usuário só acesse seus próprios dados.

## 🔐 Autenticação

O sistema utiliza autenticação do Supabase:
- Login com email e senha
- Criação automática de perfil ao registrar
- Proteção de rotas com middleware
- Redirecionamento automático após login

## 📊 Funcionalidades

### Dashboard
- KPIs em tempo real (7 indicadores)
- Gráficos interativos com Recharts:
  - Retiradas por colaborador (30 dias)
  - Movimentações por dia (7 dias)
  - Distribuição de estados das ferramentas
- Queries otimizadas para performance

### Colaboradores
- CRUD completo
- Busca por nome com memoização
- Formulários modais elegantes
- Validação com Zod

### Ferramentas
- CRUD completo
- Ações rápidas:
  - Registrar entrada
  - Registrar retirada
  - Registrar devolução
  - Enviar para conserto
- Controle automático de disponibilidade
- Filtros otimizados

### Consertos
- Listagem de consertos em aberto e concluídos
- Registro de retorno com custo
- Atualização automática do estado da ferramenta
- Histórico completo

## 🎨 Interface

### Sidebar Animado
- **Desktop**: Expande de 80px para 280px no hover
- **Mobile**: Menu fullscreen com animação de slide
- **Animações**: Transições suaves com Framer Motion
- **Ícones**: Centralizados quando colapsado
- **Links ativos**: Destaque visual automático

### Design System
- Tema claro/escuro suportado
- Componentes Shadcn UI
- Tailwind CSS para estilização
- Design inspirado no Linear/Apple

## ⚡ Performance

O sistema está otimizado para máxima performance:

- **Queries otimizadas**: Apenas campos necessários
- **Queries paralelas**: Promise.all para múltiplas requisições
- **Memoização**: useMemo para cálculos pesados
- **Lazy loading**: Componentes carregados sob demanda
- **Compressão**: Gzip ativado
- **Redução de re-renderizações**: ~80% menos re-renders

Veja mais detalhes em [PERFORMANCE.md](./PERFORMANCE.md)

## 🚢 Deploy

### Vercel (Recomendado)

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com) e conecte seu repositório
3. Configure as variáveis de ambiente em **Settings > Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = sua URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua chave anônima
4. Deploy automático!

**⚠️ IMPORTANTE**: Certifique-se de configurar as variáveis de ambiente antes do primeiro deploy!

### Outras plataformas

O projeto pode ser deployado em qualquer plataforma que suporte Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

📖 **Guia completo de deploy**: Veja [DEPLOY.md](./DEPLOY.md) para instruções detalhadas de cada plataforma.

## 🔧 Tecnologias Utilizadas

- **Next.js 14**: Framework React com App Router
- **Supabase**: Backend como serviço (Auth + Database)
- **Tailwind CSS**: Estilização utilitária
- **Shadcn UI**: Componentes UI elegantes
- **Framer Motion**: Animações suaves
- **Recharts**: Gráficos e visualizações
- **Zod**: Validação de schemas
- **TypeScript**: Tipagem estática
- **date-fns**: Manipulação de datas

## 📚 Documentação Adicional

- [SETUP.md](./SETUP.md) - Guia detalhado de configuração do Supabase
- [PERFORMANCE.md](./PERFORMANCE.md) - Otimizações e métricas de performance
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Solução de problemas comuns

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## 📧 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

Desenvolvido com ❤️ usando Next.js e Supabase
