# Guia de Configuração - Supabase

Este guia detalha como configurar o Supabase para o ERP Almoxarifado.

## Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: Nome do seu projeto
   - **Database Password**: Senha forte (anote esta senha!)
   - **Region**: Escolha a região mais próxima
5. Aguarde a criação do projeto (pode levar alguns minutos)

### 2. Executar Migration

1. No painel do Supabase, vá em **SQL Editor** (ícone no menu lateral)
2. Clique em **New Query**
3. Abra o arquivo `supabase/migrations/001_initial_schema.sql` do projeto
4. Copie todo o conteúdo do arquivo
5. Cole no editor SQL do Supabase
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a confirmação de sucesso

### 3. Obter Credenciais

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Você verá:
   - **Project URL**: Copie esta URL
   - **anon public key**: Copie esta chave

### 4. Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie o arquivo `.env.local`
2. Adicione as seguintes linhas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**⚠️ IMPORTANTE**: 
- Nunca commite o arquivo `.env.local` no Git
- O arquivo já está no `.gitignore`
- Use `.env.example` como referência

### 5. Configurar Autenticação (Opcional)

Por padrão, o Supabase permite registro de novos usuários. Se quiser restringir:

1. No painel do Supabase, vá em **Authentication** > **Settings**
2. Desative "Enable email signup" se quiser apenas login
3. Configure outros métodos de autenticação se necessário

### 6. Verificar Row Level Security (RLS)

As políticas RLS já estão configuradas na migration. Para verificar:

1. No painel do Supabase, vá em **Table Editor**
2. Selecione qualquer tabela (ex: `ferramentas`)
3. Clique na aba **Policies**
4. Você deve ver as políticas criadas automaticamente

### 7. Testar a Aplicação

1. Execute `npm run dev`
2. Acesse `http://localhost:3000`
3. Crie uma conta ou faça login
4. O sistema criará automaticamente seu perfil

## Troubleshooting

### Erro: "relation does not exist"
- Verifique se a migration foi executada corretamente
- Execute novamente o arquivo SQL

### Erro: "new row violates row-level security policy"
- Verifique se as políticas RLS estão ativas
- Confirme que o usuário está autenticado

### Erro: "Invalid API key"
- Verifique se as variáveis de ambiente estão corretas
- Reinicie o servidor de desenvolvimento após alterar `.env.local`

### Erro: "Email not confirmed"
- No painel do Supabase, vá em **Authentication** > **Users**
- Confirme manualmente o email do usuário se necessário
- Ou desative a confirmação de email em **Authentication** > **Settings**

## Próximos Passos

Após a configuração:
1. Teste o login/cadastro
2. Crie alguns colaboradores
3. Adicione ferramentas ao estoque
4. Teste as movimentações
5. Explore o dashboard

## Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase em **Logs** > **Postgres Logs**
2. Verifique o console do navegador para erros
3. Verifique o terminal onde o Next.js está rodando

