# ✅ Como Verificar se o Email foi Confirmado no Supabase

Este guia mostra como verificar se a verificação de email está funcionando corretamente.

## 🔍 Verificar no Painel do Supabase

### Método 1: Pela Lista de Usuários

1. Acesse o **Supabase Dashboard**
2. Vá em **Authentication** > **Users**
3. Procure pelo email do usuário na lista
4. Verifique a coluna **"Email Confirmed"**:
   - ✅ **Verde/Check**: Email confirmado
   - ❌ **Vermelho/X**: Email não confirmado

### Método 2: Ver Detalhes do Usuário

1. Na lista de usuários, clique no usuário
2. Veja os detalhes:
   - **Email Confirmed At**: Data/hora da confirmação (se confirmado)
   - **Email**: Email do usuário
   - **Last Sign In**: Último login

### Método 3: SQL Query (Mais Detalhado)

1. Vá em **SQL Editor**
2. Execute esta query:

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '❌ Não confirmado'
  END as status
FROM auth.users
ORDER BY created_at DESC;
```

Isso mostrará todos os usuários e o status de confirmação.

---

## ✅ Teste do Fluxo Completo

### Passo 1: Criar Conta

1. Acesse `/login`
2. Clique em "Crie uma"
3. Preencha email e senha
4. Clique em "Criar Conta"

**Verificar no Supabase:**
- Vá em **Authentication** > **Users**
- O usuário deve aparecer com **Email Confirmed: ❌ Não confirmado**

### Passo 2: Verificar Email

1. Abra o email recebido
2. Clique no link de confirmação
3. Aguarde o redirecionamento

**Verificar no Supabase:**
- Recarregue a página de usuários
- O usuário deve aparecer com **Email Confirmed: ✅ Confirmado**
- **Email Confirmed At** deve mostrar a data/hora atual

### Passo 3: Fazer Login

1. Volte para `/login`
2. Faça login com email e senha
3. Deve redirecionar para `/dashboard`

Se o email não estiver confirmado, você verá:
- "Por favor, confirme seu email antes de fazer login"

---

## 🔧 Como o Código Funciona

### Quando você cria a conta:

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/verify`,
  },
})
```

- Supabase cria o usuário
- **Email ainda NÃO está confirmado** (`email_confirmed_at = null`)
- Supabase envia email com link de confirmação

### Quando você clica no link:

O link vai para: `https://seu-projeto.supabase.co/auth/v1/verify?token=...`

O Supabase processa o token e:
- **Confirma o email** (`email_confirmed_at = agora`)
- Redireciona para `/auth/verify` (nossa rota)

### Nossa rota `/auth/verify`:

1. Verifica se há sessão ativa → se sim, redireciona para dashboard
2. Verifica se há usuário autenticado → se sim, tenta obter sessão
3. Se há token na URL → processa com `verifyOtp()` (confirma o email)
4. Redireciona para login ou dashboard

---

## ⚠️ Problemas Comuns

### Email não está sendo confirmado

**Possíveis causas:**
1. Link expirado (links expiram em 24 horas)
2. Token inválido
3. URL de redirecionamento não configurada no Supabase

**Solução:**
1. Verifique se `/auth/verify` está nas Redirect URLs do Supabase
2. Verifique os logs do Supabase em **Logs** > **Auth Logs**
3. Teste com um novo link de confirmação

### Usuário consegue fazer login sem confirmar email

**Possível causa:**
- Confirmação de email está desabilitada no Supabase

**Como verificar:**
1. Vá em **Authentication** > **Settings**
2. Veja se "Confirm email" está **ATIVADO**

---

## 📝 Logs Úteis

A rota `/auth/verify` agora inclui logs que mostram:
- Se o email foi confirmado (`email_confirmed_at`)
- Se há sessão criada
- Se o perfil foi criado

Verifique os logs no terminal onde está rodando `npm run dev` ou nos logs do Vercel.

---

## ✅ Checklist de Verificação

- [ ] Link de confirmação chega no email
- [ ] Ao clicar no link, redireciona para `/auth/verify`
- [ ] Após clicar, no Supabase o usuário mostra "Email Confirmed: ✅"
- [ ] `email_confirmed_at` tem uma data/hora
- [ ] Usuário consegue fazer login após confirmar
- [ ] Não aparece erro "Email not confirmed"

---

## 🔗 Recursos

- [Documentação do Supabase - Email Confirmation](https://supabase.com/docs/guides/auth/auth-email)
- [Documentação do Supabase - Verify OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp)

