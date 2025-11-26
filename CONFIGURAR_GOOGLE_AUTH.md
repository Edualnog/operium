# Configuração de Login com Google

## ✅ Implementações Realizadas

1. ✅ Adicionado botão de login com Google no formulário de autenticação
2. ✅ Implementada função `handleGoogleLogin` para iniciar o OAuth
3. ✅ Criada rota de callback em `/app/auth/callback/route.ts`
4. ✅ Configurado redirecionamento automático após login

## 🔧 Configurações Necessárias no Supabase

Para o login com Google funcionar corretamente, você precisa verificar as seguintes configurações no Supabase:

### 1. Verificar URLs de Redirecionamento

No seu projeto Supabase, vá em:
**Authentication > URL Configuration**

Certifique-se de que as seguintes URLs estão adicionadas em **Redirect URLs**:

- `http://localhost:3000/auth/callback` (para desenvolvimento)
- `https://seu-dominio.com/auth/callback` (para produção, se aplicável)

### 2. Verificar Configuração do Provider Google

No seu projeto Supabase, vá em:
**Authentication > Providers > Google**

Verifique se:
- ✅ **Enabled** está marcado
- ✅ **Client ID** está preenchido (do Google Cloud Console)
- ✅ **Client Secret** está preenchido (do Google Cloud Console)

### 3. Configurações no Google Cloud Console

No [Google Cloud Console](https://console.cloud.google.com/):

#### a) Criar/Verificar Credenciais OAuth 2.0

1. Vá em **APIs & Services > Credentials**
2. Clique em **+ CREATE CREDENTIALS > OAuth client ID**
3. Escolha **Web application**
4. Configure as **Authorized redirect URIs**:
   - `https://[SEU-PROJECT-REF].supabase.co/auth/v1/callback`
   - Exemplo: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`

#### b) Obter Project Reference do Supabase

Para encontrar seu Project Reference:
1. Vá no Dashboard do Supabase
2. Clique em **Settings > General**
3. Copie o valor de **Reference ID**
4. Use no formato: `https://[REFERENCE-ID].supabase.co/auth/v1/callback`

### 4. Tela de Consentimento OAuth

No Google Cloud Console:
1. Vá em **APIs & Services > OAuth consent screen**
2. Configure:
   - **App name**: Almox Fácil
   - **User support email**: seu email
   - **Developer contact information**: seu email
3. Adicione os **scopes** necessários:
   - `./auth/userinfo.email`
   - `./auth/userinfo.profile`
   - `openid`

### 5. Verificar Variáveis de Ambiente

Certifique-se de que seu arquivo `.env.local` contém:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 🧪 Testar o Login

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:3000/login`

3. Clique no botão **"Continuar com Google"**

4. Você deve ser redirecionado para a tela de login do Google

5. Após autorizar, será redirecionado de volta para `/dashboard`

## ⚠️ Problemas Comuns

### Erro: "redirect_uri_mismatch"
**Solução**: Verifique se a URL de callback no Google Cloud Console está exatamente igual à URL do Supabase (incluindo o protocolo https://).

### Erro: "Access blocked: This app's request is invalid"
**Solução**: Configure a OAuth consent screen no Google Cloud Console.

### Usuário não é redirecionado após login
**Solução**: Verifique se a URL de callback está configurada no Supabase em **Authentication > URL Configuration**.

### Perfil não é criado automaticamente
**Solução**: Verifique se a tabela `profiles` tem as políticas RLS corretas para permitir inserção.

## 📝 Checklist de Verificação

- [ ] Google OAuth credentials criadas no Google Cloud Console
- [ ] Client ID e Client Secret configurados no Supabase
- [ ] Redirect URIs configuradas no Google Cloud Console
- [ ] Redirect URLs configuradas no Supabase
- [ ] OAuth consent screen configurada no Google
- [ ] Provider Google habilitado no Supabase
- [ ] Servidor reiniciado após as mudanças
- [ ] Testado o fluxo completo de login

## 🎨 Visual do Botão

O botão de login com Google agora aparece acima do divisor "OU" com:
- ✅ Logo oficial do Google
- ✅ Texto "Continuar com Google"
- ✅ Estilo consistente com o design do sistema
- ✅ Estados de hover e disabled

## 🔍 Debug

Para debug, você pode verificar:

1. **Console do navegador**: Procure por erros de autenticação
2. **Network tab**: Verifique as requisições para `/auth/callback`
3. **Logs do Supabase**: Em **Logs > Auth** no dashboard do Supabase

Se precisar de ajuda adicional, verifique a documentação oficial:
- [Supabase Auth with OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)

