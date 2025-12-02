# Verificação do Google OAuth - Checklist

Este documento ajuda a diagnosticar o erro 500 no callback do Google OAuth.

## ✅ Checklist de Verificação

### 1. Verificar se o Google OAuth está HABILITADO no Supabase

1. Acesse: https://supabase.com/dashboard/project/cmgmobhnrjawfdafhqko/auth/providers
2. Clique em **Google**
3. Verifique se:
   - ✅ O toggle **"Enable Google provider"** está **ATIVADO** (verde)
   - ✅ O campo **"Client ID (for OAuth)"** está preenchido
   - ✅ O campo **"Client Secret (for OAuth)"** está preenchido
   - ⚠️ Se algum campo estiver vazio, o OAuth não funcionará!

### 2. Verificar URLs no Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Encontre seu **OAuth 2.0 Client ID**
3. Clique para editar
4. Verifique as **URIs autorizadas**:

#### Authorized JavaScript origins:
```
https://cmgmobhnrjawfdafhqko.supabase.co
```

#### Authorized redirect URIs:
```
https://cmgmobhnrjawfdafhqko.supabase.co/auth/v1/callback
```

**⚠️ IMPORTANTE:**
- Não pode ter espaços extras
- Não pode ter barra no final (`/auth/v1/callback/` ❌)
- Deve ser exatamente como acima

### 3. Verificar se as credenciais estão corretas

No Supabase, o **Client ID** e **Client Secret** devem ser os MESMOS do Google Cloud Console:
- Client ID: deve começar com algo como `123456789-xxxxxxxxxxxxx.apps.googleusercontent.com`
- Client Secret: deve ser uma string longa de caracteres

### 4. Verificar Redirect URLs no Supabase (IMPORTANTE para Preview URLs!)

1. Acesse: https://supabase.com/dashboard/project/cmgmobhnrjawfdafhqko/auth/url-configuration
2. Verifique as **Redirect URLs** permitidas
3. Certifique-se de que inclui:
   - `http://localhost:3000/auth/callback` (desenvolvimento local)
   - `https://*.vercel.app/auth/callback` (wildcard para preview URLs do Vercel - **OBRIGATÓRIO!**)
   - `https://seu-dominio.com/auth/callback` (produção, se aplicável)
   - `https://seu-projeto.vercel.app/auth/callback` (produção Vercel, se aplicável)

**⚠️ CRÍTICO:** Se você está usando preview deployments do Vercel (branch v2.0, PRs, etc.), você DEVE ter o wildcard `https://*.vercel.app/auth/callback` configurado, caso contrário receberá erro 500!

### 5. Verificar Logs do Supabase

1. Acesse: https://supabase.com/dashboard/project/cmgmobhnrjawfdafhqko/logs/edge-logs
2. Filtre por "auth" ou "error"
3. Procure por erros relacionados ao Google OAuth
4. Os erros geralmente mostram o problema específico

### 6. Testar a configuração

Depois de verificar tudo acima:

1. **Desative** o Google provider no Supabase
2. **Salve**
3. **Ative** novamente o Google provider
4. **Salve**
5. Tente fazer login novamente

## 🔍 Possíveis Problemas Comuns

### Problema: "Client ID ou Client Secret vazio"
**Solução:** Preencha os campos no Supabase com as credenciais do Google Cloud Console

### Problema: "URL de redirect não autorizada"
**Solução:** Adicione a URL exata `https://cmgmobhnrjawfdafhqko.supabase.co/auth/v1/callback` no Google Cloud Console

### Problema: "Credenciais inválidas"
**Solução:** Copie novamente o Client ID e Client Secret do Google Cloud Console e cole no Supabase

### Problema: "Erro 500 inesperado"
**Solução:** 
1. Verifique os logs do Supabase (passo 5)
2. Certifique-se de que o Google OAuth está habilitado
3. Verifique se as URLs estão corretas
4. **Se estiver em preview do Vercel:** Adicione `https://*.vercel.app/auth/callback` nas Redirect URLs
5. Tente desativar e reativar o provider

### Problema: "Erro 500 apenas em preview URLs do Vercel"
**Solução:**
1. Vá em **Authentication** > **URL Configuration** no Supabase
2. Adicione `https://*.vercel.app/auth/callback` nas **Redirect URLs**
3. Salve as alterações
4. Tente fazer login novamente

## 📝 Observações

- O erro acontece no callback do Supabase (`/auth/v1/callback`), não no nosso código
- Isso significa que o problema está na configuração do Supabase com o Google
- As URLs no Supabase já estão configuradas corretamente (já verificamos)
- O problema mais comum é: Google OAuth não habilitado ou credenciais incorretas

