# 🚀 Guia de Deploy - Operium

Este guia detalha como fazer o deploy da plataforma em diferentes plataformas.

## 📋 Pré-requisitos

Antes de fazer o deploy, certifique-se de que:

1. ✅ O build local funciona (`npm run build`)
2. ✅ Você tem as credenciais do Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ✅ O banco de dados está configurado (migrations executadas)

## 🎯 Vercel (Recomendado)

A Vercel é a plataforma recomendada para projetos Next.js, oferecendo deploy automático e otimizações nativas.

### Passo a Passo

1. **Instale a CLI da Vercel (opcional)**
   ```bash
   npm i -g vercel
   ```

2. **Faça login na Vercel**
   ```bash
   vercel login
   ```

3. **Deploy via CLI**
   ```bash
   vercel
   ```
   Siga as instruções e configure as variáveis de ambiente quando solicitado.

4. **Deploy via Dashboard (Recomendado)**
   
   a. Acesse [vercel.com](https://vercel.com) e faça login
   
   b. Clique em **"Add New Project"**
   
   c. Conecte seu repositório GitHub/GitLab/Bitbucket
   
   d. Configure o projeto:
      - **Framework Preset**: Next.js (detectado automaticamente)
      - **Root Directory**: `./` (raiz do projeto)
      - **Build Command**: `npm run build` (padrão)
      - **Output Directory**: `.next` (padrão)
   
   e. **Configure as Variáveis de Ambiente**:
      - Clique em **"Environment Variables"**
      - Adicione:
        ```
        NEXT_PUBLIC_SUPABASE_URL = sua_url_do_supabase
        NEXT_PUBLIC_SUPABASE_ANON_KEY = sua_chave_anonima
        ```
      - Selecione **"Production"**, **"Preview"** e **"Development"**
   
   f. Clique em **"Deploy"**

5. **Aguarde o deploy**
   - O build será executado automaticamente
   - Você receberá uma URL quando concluir
   - Exemplo: `https://seu-projeto.vercel.app`

### Configurações Adicionais na Vercel

- **Região**: Configure para a região mais próxima do Brasil (São Paulo - `gru1`)
- **Domínio Customizado**: Adicione seu domínio em Settings > Domains
- **Deploy Automático**: Cada push na branch `main` gera um novo deploy

## 🌐 Netlify

### Passo a Passo

1. **Acesse [netlify.com](https://netlify.com)** e faça login

2. **Clique em "Add new site" > "Import an existing project"**

3. **Conecte seu repositório**

4. **Configure o build**:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 18.x ou superior

5. **Configure as variáveis de ambiente**:
   - Vá em **Site settings** > **Environment variables**
   - Adicione:
     ```
     NEXT_PUBLIC_SUPABASE_URL = sua_url_do_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY = sua_chave_anonima
     ```

6. **Deploy!**

### Arquivo netlify.toml (Opcional)

Crie um arquivo `netlify.toml` na raiz:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
```

## 🚂 Railway

### Passo a Passo

1. **Acesse [railway.app](https://railway.app)** e faça login

2. **Clique em "New Project" > "Deploy from GitHub repo"**

3. **Selecione seu repositório**

4. **Configure as variáveis de ambiente**:
   - Vá em **Variables**
   - Adicione:
     ```
     NEXT_PUBLIC_SUPABASE_URL = sua_url_do_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY = sua_chave_anonima
     ```

5. **Railway detectará automaticamente o Next.js e fará o deploy**

## 🔧 Render

### Passo a Passo

1. **Acesse [render.com](https://render.com)** e faça login

2. **Clique em "New" > "Web Service"**

3. **Conecte seu repositório**

4. **Configure**:
   - **Name**: Nome do seu serviço
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free ou Paid

5. **Configure as variáveis de ambiente**:
   - Vá em **Environment**
   - Adicione:
     ```
     NEXT_PUBLIC_SUPABASE_URL = sua_url_do_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY = sua_chave_anonima
     ```

6. **Deploy!**

## ⚠️ Problemas Comuns

### Erro: "Environment variables not found"

**Solução**: Certifique-se de que as variáveis de ambiente estão configuradas na plataforma de deploy:
- Vercel: Settings > Environment Variables
- Netlify: Site settings > Environment variables
- Railway: Variables tab
- Render: Environment tab

### Erro: "Build failed"

**Solução**:
1. Verifique se o build local funciona: `npm run build`
2. Verifique os logs de build na plataforma
3. Certifique-se de que todas as dependências estão no `package.json`
4. Verifique se o Node.js está na versão 18+

### Erro: "Invalid API key" após deploy

**Solução**:
1. Verifique se as variáveis de ambiente estão corretas
2. Certifique-se de que está usando a chave **anon** (não a service_role)
3. Reinicie o deploy após alterar variáveis

### Erro: "Module not found"

**Solução**:
1. Verifique se todas as dependências estão no `package.json`
2. Execute `npm install` localmente e verifique se há erros
3. Certifique-se de que não há imports de arquivos que não existem

### Erro: "Middleware error"

**Solução**:
1. Verifique se as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão configuradas
2. O middleware precisa dessas variáveis para funcionar

## 🔐 Segurança

### Variáveis de Ambiente

- ✅ **Nunca** commite arquivos `.env.local` ou `.env`
- ✅ Use variáveis de ambiente da plataforma de deploy
- ✅ Use a chave **anon** (não a service_role) no frontend
- ✅ Configure CORS no Supabase para permitir seu domínio

### Configuração de CORS no Supabase

1. Acesse o painel do Supabase
2. Vá em **Settings** > **API**
3. Em **Additional Settings**, adicione seu domínio de deploy em **Allowed CORS origins**
4. Exemplo: `https://seu-projeto.vercel.app`

## 📊 Verificação Pós-Deploy

Após o deploy, verifique:

1. ✅ A aplicação carrega sem erros
2. ✅ O login funciona
3. ✅ As rotas protegidas redirecionam corretamente
4. ✅ As queries ao banco de dados funcionam
5. ✅ O dashboard carrega os dados

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs de build na plataforma
2. Verifique o console do navegador para erros
3. Teste o build local: `npm run build`
4. Consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Dica**: Sempre teste o build local antes de fazer deploy:
```bash
npm run build
npm start
```

