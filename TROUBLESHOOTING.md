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

## Verificar se está tudo funcionando

1. Crie uma conta (ou faça login)
2. Você deve ser redirecionado para `/dashboard`
3. Se não funcionar, verifique o console do navegador (F12) para erros
4. Verifique o terminal onde o Next.js está rodando

