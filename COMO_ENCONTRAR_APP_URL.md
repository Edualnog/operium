# 📍 Como Encontrar a APP_URL no Vercel

A `APP_URL` é a URL onde seu projeto SaaS está deployado no Vercel.

## 🔍 Onde Encontrar a APP_URL

### Opção 1: Na página de Overview do Projeto

1. Acesse o Vercel Dashboard: [vercel.com](https://vercel.com)
2. Selecione o projeto **"erp-almox-facil"**
3. Na página **"Overview"** (visão geral), você verá:
   - **Production**: `https://erp-almox-facil-xxxxx.vercel.app` ou seu domínio customizado
   - Essa é a URL que você deve usar como `APP_URL`

### Opção 2: Na página de Deployments

1. Clique em **"Deployments"** no menu superior
2. Procure pelo deployment mais recente com status **"Ready"** (verde)
3. A URL está visível abaixo do nome do deployment
4. Copie essa URL (ex: `https://erp-almox-facil.vercel.app`)

### Opção 3: Na página de Settings > Domains

1. Clique em **"Settings"** > **"Domains"**
2. Se você configurou um domínio customizado, use esse
3. Se não tiver domínio customizado, use a URL padrão do Vercel

### Opção 4: Na URL do navegador

Olhe a barra de endereço quando estiver acessando o projeto no Vercel. A URL que você usa para acessar o projeto é a `APP_URL`.

---

## ✅ Exemplo de URLs

**URL padrão do Vercel:**
```
https://erp-almox-facil.vercel.app
```

**URL com domínio customizado:**
```
https://app.almoxfacil.com.br
```
ou
```
https://almoxfacil.alnog.com.br
```

---

## 🔧 Como Configurar no Vercel

1. Vá em **Settings** > **Environment Variables**
2. Clique em **"Add New"**
3. Adicione:
   - **Key**: `APP_URL`
   - **Value**: Cole a URL do seu projeto (ex: `https://erp-almox-facil.vercel.app`)
   - **Environment**: Selecione **"Production"**, **"Preview"** e **"Development"**
4. Clique em **"Save"**

---

## ⚠️ Importante

- **Não inclua barra final** (`/`): Use `https://erp-almox-facil.vercel.app` e não `https://erp-almox-facil.vercel.app/`
- **Use HTTPS**: Sempre use `https://` (nunca `http://`)
- **Use a URL de produção**: Se tiver múltiplos ambientes, use a URL de produção

---

## 📝 Exemplo Completo

```env
APP_URL=https://erp-almox-facil.vercel.app
NEXT_PUBLIC_APP_URL=https://erp-almox-facil.vercel.app
```

**Nota:** Você pode usar a mesma URL para ambas as variáveis se precisar.

