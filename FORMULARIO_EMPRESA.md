# Formulário de Dados da Empresa no Perfil

## Resumo das Alterações

O componente de perfil agora inclui tanto o seletor de avatar quanto um formulário completo para preencher os dados da empresa do usuário.

## Funcionalidades Adicionadas

### 1. ✅ Seletor de Avatar
- Mantido o seletor de avatar existente
- Salva automaticamente quando um avatar é selecionado
- Carrega o avatar salvo ao abrir o modal

### 2. ✅ Formulário de Dados da Empresa
- **Nome da Empresa**: Campo de texto para o nome da empresa
- **CNPJ**: Campo para CNPJ da empresa
- **Email da Empresa**: Campo de email
- **Telefone**: Campo para telefone de contato
- **Botão Salvar**: Salva todos os dados da empresa no banco de dados

## Migration Necessária

### Arquivo: `supabase/migrations/012_add_company_fields_to_profiles.sql`

Esta migration adiciona os seguintes campos na tabela `profiles`:
- `company_name` (TEXT, nullable)
- `cnpj` (TEXT, nullable)
- `company_email` (TEXT, nullable)
- `phone` (TEXT, nullable)

### Como Executar a Migration

#### Opção 1: Via Supabase Dashboard (Recomendado)
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `supabase/migrations/012_add_company_fields_to_profiles.sql`
4. Execute a query

#### Opção 2: Via Supabase CLI
```bash
supabase migration up
```

### Conteúdo da Migration
```sql
-- Adicionar campos de empresa na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN public.profiles.company_name IS 'Nome da empresa do usuário';
COMMENT ON COLUMN public.profiles.cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN public.profiles.company_email IS 'Email da empresa';
COMMENT ON COLUMN public.profiles.phone IS 'Telefone de contato';
```

## Estrutura do Componente

O componente `AvatarPicker` agora inclui:

1. **Seção de Avatar**:
   - Exibição do avatar selecionado
   - Seleção de avatar (4 opções)
   - Salvamento automático ao selecionar

2. **Separador Visual**:
   - Linha divisória entre avatar e formulário

3. **Formulário de Dados da Empresa**:
   - Campos de entrada para todos os dados
   - Botão de salvar
   - Feedback visual ao salvar

## Comportamento

- **Carregamento**: Ao abrir o modal, carrega tanto o avatar quanto os dados da empresa salvos
- **Salvamento do Avatar**: Automático ao selecionar um avatar
- **Salvamento dos Dados**: Manual através do botão "Salvar Dados da Empresa"
- **Validação**: Campos são opcionais (podem ficar vazios)
- **Feedback**: Mensagens de sucesso/erro ao salvar

## Interface do Usuário

```
┌─────────────────────────────────────┐
│  [X]                                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   [Avatar Grande]           │   │
│  │   Me                         │   │
│  │   Select your avatar         │   │
│  │   [●] [○] [○] [○]           │   │
│  └─────────────────────────────┘   │
│                                     │
│  ───────────────────────────────   │
│                                     │
│  Dados da Empresa                  │
│                                     │
│  Nome da Empresa: [___________]    │
│  CNPJ: [___________]                │
│  Email da Empresa: [___________]   │
│  Telefone: [___________]            │
│                                     │
│  [Salvar Dados da Empresa]         │
└─────────────────────────────────────┘
```

## Arquivos Modificados

1. `components/ui/avatar-picker.tsx` - Componente principal atualizado
2. `components/layout/DashboardWrapper.tsx` - Dialog ajustado para maior tamanho
3. `supabase/migrations/012_add_company_fields_to_profiles.sql` - Nova migration criada

## Próximos Passos (Opcional)

1. **Validação de CNPJ**: Adicionar máscara e validação de CNPJ
2. **Validação de Telefone**: Adicionar máscara de telefone brasileiro
3. **Validação de Email**: Melhorar validação de email
4. **Feedback Visual**: Adicionar toast notifications em vez de alert
5. **Campos Adicionais**: Adicionar mais campos se necessário (endereço, site, etc.)

## Notas Importantes

- ⚠️ **A migration deve ser executada antes de usar a funcionalidade**
- Os campos são opcionais - o usuário pode preencher apenas os que desejar
- Os dados são salvos na tabela `profiles` do usuário logado
- O RLS (Row Level Security) garante que cada usuário só vê/edita seus próprios dados

