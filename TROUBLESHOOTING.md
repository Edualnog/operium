# Troubleshooting - Problemas Comuns

## Problema: Não consigo fazer login após criar a conta

### Solução 1: Desabilitar confirmação de email (Recomendado para desenvolvimento)

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** > **Settings**
4. Role até a seção **Email Auth**
5. **Desative** a opção "Confirm email"
6. Salve as alterações

Agora você poderá fazer login imediatamente após criar a conta, sem precisar confirmar o email.

### Solução 2: Confirmar email manualmente

1. Acesse o painel do Supabase
2. Vá em **Authentication** > **Users**
3. Encontre seu usuário na lista
4. Clique nos três pontos (...) ao lado do usuário
5. Selecione "Confirm email"

### Solução 3: Verificar se a migration foi executada

Se você ainda não executou a migration SQL, o sistema não funcionará:

1. Acesse o painel do Supabase
2. Vá em **SQL Editor**
3. Execute o arquivo `supabase/migrations/001_initial_schema.sql`

## Problema: Erro ao criar perfil

O sistema cria automaticamente um perfil quando você se registra. Se isso não acontecer:

1. Verifique se a migration foi executada (especialmente a função `handle_new_user`)
2. Verifique os logs do Supabase em **Logs** > **Postgres Logs**

## Problema: Erro "relation does not exist"

Isso significa que as tabelas não foram criadas:

1. Execute a migration SQL no Supabase
2. Verifique se todas as tabelas foram criadas em **Table Editor**

## Problema: Não consigo ver meus dados

Verifique se o Row Level Security (RLS) está ativo:

1. No painel do Supabase, vá em **Table Editor**
2. Selecione uma tabela
3. Vá na aba **Policies**
4. Verifique se as políticas estão criadas e ativas

## Problema: Erro "Failed to fetch" ao fazer upload de foto

Este é um erro comum relacionado a CORS ou configuração do Storage. Siga estes passos:

### Solução 1: Configurar CORS no Supabase (MAIS COMUM)

1. Acesse o **Supabase Dashboard**
2. Vá em **Settings** (ícone de engrenagem)
3. Clique em **API**
4. Role até **"Additional Settings"**
5. Em **"Allowed CORS origins"**, adicione:
   - Para desenvolvimento: `http://localhost:3000`
   - Para produção: seu domínio (ex: `https://seu-projeto.vercel.app`)
6. Clique em **Save**
7. Tente fazer upload novamente

### Solução 2: Verificar se o bucket existe

1. No Supabase Dashboard, vá em **Storage**
2. Verifique se existe o bucket `colaboradores-fotos`
3. Se não existir:
   - Clique em **"New bucket"**
   - Nome: `colaboradores-fotos`
   - Marque como **público**
   - Limite de tamanho: 5 MB
   - Tipos permitidos: `image/jpeg, image/png, image/gif, image/webp`

### Solução 3: Executar migration de Storage

1. No Supabase Dashboard, vá em **SQL Editor**
2. Execute o arquivo `supabase/migrations/009_create_storage_bucket.sql`
3. Isso criará as políticas RLS necessárias

### Solução 4: Verificar variáveis de ambiente

Certifique-se de que as variáveis estão configuradas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**📖 Guia completo**: Consulte [SETUP_STORAGE.md](./SETUP_STORAGE.md) para instruções detalhadas.

## Verificar se está tudo funcionando

1. Crie uma conta (ou faça login)
2. Você deve ser redirecionado para `/dashboard`
3. Se não funcionar, verifique o console do navegador (F12) para erros
4. Verifique o terminal onde o Next.js está rodando

