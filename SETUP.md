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

### 5.1. Configurar Login com Google OAuth

Para habilitar o login com Google:

1. No painel do Supabase, vá em **Authentication** > **Providers**
2. Clique em **Google**
3. Ative o toggle "Enable Google provider"
4. Você precisará criar um projeto no Google Cloud Console:
   - Acesse [Google Cloud Console](https://console.cloud.google.com/)
   - Crie um novo projeto ou selecione um existente
   - Vá em **APIs & Services** > **Credentials**
   - Clique em **Create Credentials** > **OAuth client ID**
   - Escolha **Web application**
   - Adicione as URLs autorizadas:
     - **Authorized JavaScript origins**: `https://seu-projeto.supabase.co`
     - **Authorized redirect URIs**: `https://seu-projeto.supabase.co/auth/v1/callback`
   - Copie o **Client ID** e **Client Secret**
5. Volte ao Supabase e cole o Client ID e Client Secret
6. Clique em **Save**

**⚠️ IMPORTANTE**: Substitua `seu-projeto` pelo ID do seu projeto Supabase. Você encontra o ID na URL do projeto ou em **Settings** > **General** > **Reference ID**.

**📋 Configuração Adicional Necessária:**

7. No Supabase Dashboard, vá em **Authentication** > **URL Configuration**
8. Certifique-se de que o **Site URL** está configurado corretamente:
   - Para desenvolvimento local: `http://localhost:3000`
   - Para produção: sua URL de produção (ex: `https://seu-dominio.com` ou `https://seu-projeto.vercel.app`)
9. Adicione as **Redirect URLs** permitidas:
   - `http://localhost:3000/auth/callback` (desenvolvimento - OAuth)
   - `http://localhost:3000/auth/verify` (desenvolvimento - verificação de email)
   - `http://localhost:3000/auth/reset-password` (desenvolvimento - recuperação de senha)
   - `https://seu-dominio.com/auth/callback` (produção OAuth, se aplicável)
   - `https://seu-dominio.com/auth/verify` (produção - verificação de email)
   - `https://seu-dominio.com/auth/reset-password` (produção - recuperação de senha)
   - `https://*.vercel.app/auth/callback` (wildcard para preview URLs do Vercel - OAuth)
   - `https://*.vercel.app/auth/verify` (wildcard para preview URLs do Vercel - verificação de email)
   - `https://*.vercel.app/auth/reset-password` (wildcard para preview URLs do Vercel - recuperação de senha)
   - `https://seu-projeto.vercel.app/auth/callback` (produção Vercel - OAuth)
   - `https://seu-projeto.vercel.app/auth/verify` (produção Vercel - verificação de email)
   - `https://seu-projeto.vercel.app/auth/reset-password` (produção Vercel - recuperação de senha)
10. Clique em **Save**

**⚠️ IMPORTANTE para Verificação de Email e Recuperação de Senha:**
- A rota `/auth/verify` é essencial para tratar erros de verificação de email (links expirados, etc.)
- A rota `/auth/reset-password` é essencial para recuperação de senha
- Sem essas URLs configuradas, erros mostrarão JSON bruto do Supabase
- Configure tanto para desenvolvimento quanto para produção

**⚠️ IMPORTANTE para Preview URLs do Vercel:**
- Se você usar preview deployments do Vercel (como para a branch v2.0), você DEVE adicionar o wildcard `https://*.vercel.app/auth/callback`
- Isso permite que qualquer preview URL do Vercel funcione com o login Google
- Sem isso, as preview URLs gerarão erro 500 no callback do OAuth

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

### Erro: 500 no callback do Google OAuth (`/auth/v1/callback`)

Este erro ocorre quando o Google OAuth não está configurado corretamente no Supabase. Siga estes passos:

**1. Verificar se o Google OAuth está habilitado:**
- Vá em **Authentication** > **Providers** > **Google**
- Certifique-se de que o toggle "Enable Google provider" está **ATIVADO**
- Verifique se o **Client ID** e **Client Secret** estão preenchidos corretamente

**2. Verificar URLs no Google Cloud Console:**
- Acesse [Google Cloud Console](https://console.cloud.google.com/)
- Vá em **APIs & Services** > **Credentials**
- Clique no seu OAuth Client ID
- Verifique se as URLs estão corretas:
  - **Authorized JavaScript origins**: `https://cmgmobhnrjawfdafhqko.supabase.co`
  - **Authorized redirect URIs**: `https://cmgmobhnrjawfdafhqko.supabase.co/auth/v1/callback`
  - ⚠️ O ID do projeto (`cmgmobhnrjawfdafhqko`) deve ser o do SEU projeto Supabase

**3. Verificar Site URL e Redirect URLs no Supabase:**
- Vá em **Authentication** > **URL Configuration**
- **Site URL** deve estar configurado (ex: `http://localhost:3000` para desenvolvimento)
- Adicione `http://localhost:3000/auth/callback` em **Redirect URLs**

**4. Verificar os logs do Supabase:**
- Vá em **Logs** > **Auth Logs** no Supabase Dashboard
- Procure por erros específicos relacionados ao Google OAuth

**5. Se ainda não funcionar:**
- Desative e reative o Google provider no Supabase
- Verifique se as credenciais do Google Cloud Console estão corretas
- Certifique-se de que não há espaços extras nas URLs

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

