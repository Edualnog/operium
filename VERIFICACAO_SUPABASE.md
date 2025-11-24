# ✅ Verificação do Supabase

Este documento ajuda a verificar se tudo está configurado corretamente no seu Supabase.

## 🚀 Verificação Automática (Recomendado)

A forma mais rápida de verificar tudo é executar o script SQL de verificação:

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Abra o arquivo `supabase/migrations/003_verificacao.sql`
5. Copie todo o conteúdo e cole no editor
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Veja os resultados na aba **Messages** (abaixo do editor)

O script verificará automaticamente:
- ✅ Todas as tabelas
- ✅ Row Level Security (RLS)
- ✅ Todas as políticas RLS
- ✅ Funções e triggers
- ✅ Índices de performance
- ✅ Extensões
- ✅ Estrutura das colunas

**Resultado:** Você verá uma lista com ✅ (correto) ou ❌ (faltando) para cada item.

---

## 📋 Verificação Manual (Alternativa)

## 📋 Checklist de Verificação

### 1. ✅ Tabelas Criadas

Verifique se todas as tabelas existem no **Table Editor**:

- [ ] `profiles`
- [ ] `colaboradores`
- [ ] `ferramentas`
- [ ] `movimentacoes`
- [ ] `consertos`

**Como verificar:**
1. Acesse o painel do Supabase
2. Vá em **Table Editor** (menu lateral)
3. Verifique se todas as 5 tabelas aparecem na lista

---

### 2. ✅ Estrutura das Tabelas

Verifique se cada tabela tem as colunas corretas:

#### Tabela: `profiles`
- [ ] `id` (UUID, Primary Key)
- [ ] `name` (TEXT)
- [ ] `created_at` (TIMESTAMP)

#### Tabela: `colaboradores`
- [ ] `id` (UUID, Primary Key)
- [ ] `profile_id` (UUID, Foreign Key)
- [ ] `nome` (TEXT)
- [ ] `cargo` (TEXT, nullable)
- [ ] `telefone` (TEXT, nullable)
- [ ] `created_at` (TIMESTAMP)

#### Tabela: `ferramentas`
- [ ] `id` (UUID, Primary Key)
- [ ] `profile_id` (UUID, Foreign Key)
- [ ] `nome` (TEXT)
- [ ] `categoria` (TEXT, nullable)
- [ ] `quantidade_total` (INTEGER)
- [ ] `quantidade_disponivel` (INTEGER)
- [ ] `estado` (TEXT: 'ok', 'danificada', 'em_conserto')
- [ ] `created_at` (TIMESTAMP)

#### Tabela: `movimentacoes`
- [ ] `id` (UUID, Primary Key)
- [ ] `profile_id` (UUID, Foreign Key)
- [ ] `ferramenta_id` (UUID, Foreign Key)
- [ ] `colaborador_id` (UUID, Foreign Key, nullable)
- [ ] `tipo` (TEXT: 'entrada', 'retirada', 'devolucao', 'ajuste', 'conserto')
- [ ] `quantidade` (INTEGER)
- [ ] `observacoes` (TEXT, nullable)
- [ ] `data` (TIMESTAMP)

#### Tabela: `consertos`
- [ ] `id` (UUID, Primary Key)
- [ ] `profile_id` (UUID, Foreign Key)
- [ ] `ferramenta_id` (UUID, Foreign Key)
- [ ] `descricao` (TEXT, nullable)
- [ ] `status` (TEXT: 'aguardando', 'em_andamento', 'concluido')
- [ ] `custo` (NUMERIC, nullable)
- [ ] `data_envio` (TIMESTAMP)
- [ ] `data_retorno` (TIMESTAMP, nullable)

**Como verificar:**
1. No **Table Editor**, clique em cada tabela
2. Vá na aba **Columns**
3. Verifique se todas as colunas estão presentes

---

### 3. ✅ Row Level Security (RLS) Ativado

Verifique se o RLS está habilitado em todas as tabelas:

- [ ] `profiles` - RLS habilitado
- [ ] `colaboradores` - RLS habilitado
- [ ] `ferramentas` - RLS habilitado
- [ ] `movimentacoes` - RLS habilitado
- [ ] `consertos` - RLS habilitado

**Como verificar:**
1. No **Table Editor**, selecione uma tabela
2. Vá na aba **Policies**
3. Verifique se há políticas criadas (deve haver pelo menos 4 por tabela)

---

### 4. ✅ Políticas RLS Criadas

Para cada tabela, verifique se existem as seguintes políticas:

#### Tabela: `profiles`
- [ ] "Users can view own profile" (SELECT)
- [ ] "Users can update own profile" (UPDATE)
- [ ] "Users can insert own profile" (INSERT)

#### Tabela: `colaboradores`
- [ ] "Users can view own colaboradores" (SELECT)
- [ ] "Users can insert own colaboradores" (INSERT)
- [ ] "Users can update own colaboradores" (UPDATE)
- [ ] "Users can delete own colaboradores" (DELETE)

#### Tabela: `ferramentas`
- [ ] "Users can view own ferramentas" (SELECT)
- [ ] "Users can insert own ferramentas" (INSERT)
- [ ] "Users can update own ferramentas" (UPDATE)
- [ ] "Users can delete own ferramentas" (DELETE)

#### Tabela: `movimentacoes`
- [ ] "Users can view own movimentacoes" (SELECT)
- [ ] "Users can insert own movimentacoes" (INSERT)
- [ ] "Users can update own movimentacoes" (UPDATE)
- [ ] "Users can delete own movimentacoes" (DELETE)

#### Tabela: `consertos`
- [ ] "Users can view own consertos" (SELECT)
- [ ] "Users can insert own consertos" (INSERT)
- [ ] "Users can update own consertos" (UPDATE)
- [ ] "Users can delete own consertos" (DELETE)

**Como verificar:**
1. No **Table Editor**, selecione uma tabela
2. Vá na aba **Policies**
3. Verifique se todas as políticas listadas acima existem

---

### 5. ✅ Função e Trigger Criados

Verifique se a função e o trigger para criar profile automaticamente existem:

- [ ] Função `handle_new_user()` criada
- [ ] Trigger `on_auth_user_created` criado

**Como verificar:**
1. Vá em **Database** > **Functions**
2. Procure por `handle_new_user`
3. Vá em **Database** > **Triggers**
4. Procure por `on_auth_user_created`

---

### 6. ✅ Índices Criados

Verifique se os índices de performance foram criados:

**Índices básicos:**
- [ ] `idx_colaboradores_profile_id`
- [ ] `idx_ferramentas_profile_id`
- [ ] `idx_movimentacoes_profile_id`
- [ ] `idx_consertos_profile_id`

**Índices de filtros:**
- [ ] `idx_ferramentas_estado`
- [ ] `idx_movimentacoes_tipo`
- [ ] `idx_movimentacoes_data`
- [ ] `idx_consertos_status`

**Índices compostos:**
- [ ] `idx_movimentacoes_profile_tipo_data`
- [ ] `idx_ferramentas_profile_estado`

**Índices de foreign keys:**
- [ ] `idx_movimentacoes_ferramenta_id`
- [ ] `idx_movimentacoes_colaborador_id`
- [ ] `idx_consertos_ferramenta_id`

**Como verificar:**
1. Vá em **Database** > **Indexes**
2. Verifique se todos os índices listados acima existem

---

### 7. ✅ Extensão UUID Habilitada

- [ ] Extensão `uuid-ossp` está habilitada

**Como verificar:**
1. Vá em **Database** > **Extensions**
2. Procure por `uuid-ossp`
3. Verifique se está habilitada

---

### 8. ✅ Autenticação Configurada

- [ ] Email signup está habilitado (ou desabilitado, conforme sua preferência)
- [ ] Email confirmation está configurado (recomendado desabilitar para desenvolvimento)

**Como verificar:**
1. Vá em **Authentication** > **Settings**
2. Verifique as configurações de **Email Auth**

---

## 🔧 Como Executar as Migrations

Se algo estiver faltando, execute as migrations:

### Migration 1: Schema Inicial
1. Vá em **SQL Editor**
2. Clique em **New Query**
3. Abra o arquivo `supabase/migrations/001_initial_schema.sql`
4. Copie todo o conteúdo
5. Cole no editor SQL
6. Clique em **Run** (ou Ctrl+Enter)

### Migration 2: Índices de Performance
1. No **SQL Editor**, crie uma nova query
2. Abra o arquivo `supabase/migrations/002_add_indexes.sql`
3. Copie todo o conteúdo
4. Cole no editor SQL
5. Clique em **Run**

---

## 🧪 Teste Rápido

Após verificar tudo, teste se está funcionando:

1. **Criar uma conta:**
   - Acesse `/login` na aplicação
   - Clique em "Crie uma"
   - Preencha email e senha
   - Clique em "Criar Conta"

2. **Verificar se o profile foi criado:**
   - No Supabase, vá em **Table Editor** > `profiles`
   - Deve aparecer um registro com seu email

3. **Fazer login:**
   - Volte para a aplicação
   - Faça login com o email e senha criados
   - Deve redirecionar para `/dashboard`

4. **Criar um colaborador:**
   - No dashboard, vá em "Colaboradores"
   - Clique em "Novo Colaborador"
   - Preencha os dados e salve
   - Verifique no Supabase se o registro foi criado

---

## ⚠️ Problemas Comuns

### Erro: "relation does not exist"
**Solução:** Execute a migration `001_initial_schema.sql`

### Erro: "permission denied"
**Solução:** Verifique se as políticas RLS estão criadas e ativas

### Erro: "function does not exist"
**Solução:** Execute a migration `001_initial_schema.sql` (ela cria a função `handle_new_user`)

### Profile não é criado automaticamente
**Solução:** Verifique se o trigger `on_auth_user_created` existe e está ativo

---

## 📝 Notas

- Todas as migrations são idempotentes (podem ser executadas múltiplas vezes)
- Use `IF NOT EXISTS` nas migrations para evitar erros
- Sempre verifique os logs do Supabase se algo não funcionar

---

**Última atualização:** Verificação completa do schema e índices ✅

