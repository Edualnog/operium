# 🔧 Como Configurar CORS no Supabase - Passo a Passo

Este guia mostra **exatamente** onde clicar para configurar o CORS e resolver o erro "Failed to fetch" no upload de fotos.

## 📍 Passo a Passo Visual

### ⚠️ IMPORTANTE: Você está na página errada!

Você está em **Authentication > URL Configuration**. Essa página é para URLs de autenticação, **não** para CORS do Storage.

### ✅ Onde Configurar CORS Corretamente:

1. **No menu lateral esquerdo**, procure o ícone de **engrenagem** ⚙️ (Settings)
   - Está na parte **inferior** do menu lateral
   - **NÃO** está dentro de "Authentication"
   - É um ícone separado, geralmente no final da lista

2. **Clique** no ícone de Settings (engrenagem)

3. Você verá várias opções de configuração do projeto

### 3. Acesse a Seção API

1. Na lista de configurações, procure e **clique em "API"**
2. Isso abrirá as configurações da API do seu projeto

### 4. Configure o CORS

1. **Role a página para baixo** até encontrar a seção **"Additional Settings"** ou **"CORS"**
2. Procure por um campo chamado:
   - **"Allowed CORS origins"** OU
   - **"CORS origins"** OU
   - **"Site URL"**

3. **Adicione os domínios** (um por linha ou separados por vírgula):

   **Para desenvolvimento local:**
   ```
   http://localhost:3000
   ```

   **Para produção (se já fez deploy):**
   ```
   https://seu-projeto.vercel.app
   ```
   *(Substitua pelo seu domínio real)*

   **Se estiver testando localmente E em produção, adicione ambos:**
   ```
   http://localhost:3000
   https://seu-projeto.vercel.app
   ```

4. **Clique em "Save"** ou **"Update"** para salvar

### 5. Teste Novamente

1. Volte para sua aplicação
2. Recarregue a página (F5)
3. Tente fazer upload de uma foto novamente

## 🎯 Caminho Completo

```
Supabase Dashboard
  └── Menu Lateral (esquerda)
      └── ⚙️ Settings (ícone de engrenagem)
          └── API
              └── Role até "Additional Settings"
                  └── "Allowed CORS origins"
                      └── Adicione: http://localhost:3000
                      └── Clique em "Save"
```

## 📸 Onde Está no Dashboard?

**Você está em:** Authentication > URL Configuration ❌

**Você precisa ir para:** Settings (ícone de engrenagem) > API ✅

### Passos Corretos:

1. **Sair da seção Authentication**:
   - Você está em "Authentication" no menu lateral
   - Role o menu lateral para **baixo** até o final
   - Procure o ícone de **engrenagem** ⚙️ (Settings)
   - Este ícone está **FORA** da seção Authentication
   - É um item separado no menu lateral

2. **Clicar em Settings (engrenagem)**:
   - Isso abrirá as configurações gerais do projeto
   - Você verá opções como: General, API, Database, etc.

3. **Clicar em "API"**:
   - Na lista de configurações, clique em **"API"**
   - Você verá informações sobre:
     - Project URL
     - anon public key
     - service_role key

4. **Role até "Additional Settings"**:
   - Role a página para **baixo**
   - Procure por **"Allowed CORS origins"** ou **"CORS origins"**
   - Adicione: `http://localhost:3000`
   - Se tiver domínio de produção: `https://almoxfacil.alnog.com.br`
   - Clique em **"Save"**

### 📝 Nota sobre a página atual:

A página "URL Configuration" que você está vendo é útil para autenticação, mas **não resolve o problema de CORS do Storage**. Você precisa ir em **Settings > API** para configurar o CORS do Storage.

## ✅ Solução Alternativa: Upload via API Route

Se você não encontrar a opção de CORS ou ela não resolver o problema, o código foi atualizado para usar uma **API route** como alternativa. Isso contorna problemas de CORS porque o upload é feito pelo servidor, não diretamente pelo navegador.

**Não é necessário fazer nada!** O código já tenta primeiro o upload direto e, se falhar por CORS, automaticamente usa a API route.

## ⚠️ Se Não Encontrar a Opção CORS

Algumas versões do Supabase podem ter a configuração em lugares diferentes:

### Alternativa 1: Authentication Settings
1. Vá em **Authentication** (ícone de pessoa no menu lateral)
2. Clique em **Settings**
3. Procure por **"Site URL"** ou **"Redirect URLs"**
4. Adicione seu domínio lá também

### Alternativa 2: Project Settings
1. Vá em **Settings** > **General**
2. Procure por **"Site URL"**
3. Adicione seu domínio

## ✅ Verificação

Após configurar, você deve ver:
- ✅ O domínio adicionado na lista de CORS origins
- ✅ Uma mensagem de sucesso ao salvar
- ✅ O upload de fotos funcionando sem erro "Failed to fetch"

## 🆘 Ainda Não Funcionou?

Se mesmo após configurar o CORS o erro persistir:

1. **Verifique se o bucket existe**:
   - Vá em **Storage** (ícone de pasta no menu lateral)
   - Verifique se existe o bucket `colaboradores-fotos`
   - Se não existir, crie-o (veja SETUP_STORAGE.md)

2. **Verifique as políticas RLS**:
   - Execute a migration SQL: `supabase/migrations/009_create_storage_bucket.sql`
   - Vá em Storage > colaboradores-fotos > Policies
   - Verifique se as políticas estão criadas

3. **Limpe o cache do navegador**:
   - Pressione Ctrl+Shift+Delete (Windows) ou Cmd+Shift+Delete (Mac)
   - Limpe cache e cookies
   - Recarregue a página

4. **Verifique o console do navegador**:
   - Pressione F12
   - Vá na aba "Console"
   - Veja se há erros mais específicos

---

**💡 Dica**: Se você estiver em desenvolvimento local, adicione `http://localhost:3000`. Se já fez deploy, adicione o domínio de produção também.

