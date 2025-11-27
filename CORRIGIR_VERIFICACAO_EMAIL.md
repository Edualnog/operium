# 🔧 Corrigir Verificação de Email - Erro JSON

## ❌ Problema

Quando o usuário clica no link de confirmação de email que expirou, aparece uma tela com JSON bruto do Supabase:

```json
{"code":403,"error_code":"otp_expired","msg":"Email link is invalid or has expired"}
```

## ✅ Solução

O problema ocorre porque o Supabase precisa ter a rota `/auth/verify` configurada nas **Redirect URLs** permitidas. Quando não está configurada, o Supabase redireciona diretamente para seu próprio endpoint, mostrando JSON bruto.

### Passo 1: Configurar Redirect URLs no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **Authentication** > **URL Configuration**
3. Em **Redirect URLs**, adicione:

**Para desenvolvimento:**
```
http://localhost:3000/auth/verify
```

**Para produção (Vercel):**
```
https://seu-projeto.vercel.app/auth/verify
https://*.vercel.app/auth/verify
```

**Se tiver domínio customizado:**
```
https://seu-dominio.com/auth/verify
```

4. Clique em **Save**

### Passo 2: Verificar Site URL

Certifique-se de que o **Site URL** está configurado:

- **Desenvolvimento:** `http://localhost:3000`
- **Produção:** `https://seu-projeto.vercel.app` (ou seu domínio customizado)

### Passo 3: Testar

1. Crie uma nova conta
2. Aguarde o email de confirmação
3. Clique no link (mesmo que tenha expirado)
4. Agora deve redirecionar para `/login` com uma mensagem amigável em vez de JSON bruto

---

## 📝 Como Funciona

1. Usuário clica no link de confirmação no email
2. Supabase processa o link
3. Se houver erro (ex: link expirado), Supabase redireciona para `/auth/verify?error=...`
4. Nossa rota `/auth/verify` intercepta o erro
5. Redireciona para `/login` com mensagem amigável

---

## ⚠️ Importante

- A rota `/auth/verify` já está implementada no código
- Você só precisa configurar as Redirect URLs no Supabase
- Isso resolve tanto links expirados quanto outros erros de verificação

---

## 🔍 Verificar se Está Funcionando

Após configurar, quando clicar em um link expirado, você deve ver:
- Redirecionamento para `/login`
- Mensagem: "O link de verificação expirou. Por favor, solicite um novo link de confirmação."

Em vez de:
- JSON bruto do Supabase

