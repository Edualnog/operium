# 💳 Integração Stripe - Guia Completo

## ✅ Status: PRONTO PARA USO

Todas as APIs da Stripe estão configuradas e prontas para processar pagamentos!

---

## 🎯 Como Funciona

### Fluxo Completo:

1. **Landing Page** → Usuário clica no botão CTA
2. **Login/Registro** → Usuário faz login no SaaS (se não estiver logado)
3. **Checkout** → Chama `/api/create-checkout` para criar sessão Stripe
4. **Pagamento** → Usuário paga no Stripe (7 dias grátis de trial)
5. **Webhook** → Stripe atualiza `subscription_status` no banco
6. **Redirect** → Volta para `/dashboard` com assinatura ativa

---

## 📋 APIs Disponíveis

### 1. **POST `/api/create-checkout`** - Iniciar Checkout

**Endpoint:** `POST /api/create-checkout`

**Autenticação:** Requer usuário logado

**Resposta de Sucesso:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_..."
}
```

**Resposta de Erro (não autenticado):**
```json
{
  "error": "Não autorizado. Faça login primeiro.",
  "redirect": "/login"
}
```

**Uso:**
```javascript
const response = await fetch('/api/create-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})

const data = await response.json()
if (data.url) {
  window.location.href = data.url // Redireciona para Stripe
}
```

---

### 3. **POST `/api/stripe-webhook`** - Webhook do Stripe

**Endpoint:** `POST /api/stripe-webhook`

**Configuração no Stripe Dashboard:**
1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Clique em "Add endpoint"
3. URL: `https://seu-saas.vercel.app/api/stripe-webhook`
4. Eventos para escutar:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copie o **Signing secret** e adicione como `STRIPE_WEBHOOK_SECRET` no `.env`

---

## 🎨 Componente React Pronto

### `CheckoutButton`

Componente pronto para usar em qualquer página:

```tsx
import CheckoutButton from "@/components/checkout/CheckoutButton"

// Uso básico
<CheckoutButton>Assinar Agora</CheckoutButton>

// Com customização
<CheckoutButton 
  variant="outline" 
  size="lg"
  className="w-full"
>
  Começar Teste Grátis
</CheckoutButton>
```

**Props:**
- `children`: Texto do botão (padrão: "Assinar Agora")
- `variant`: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
- `size`: "default" | "sm" | "lg" | "icon"
- `className`: Classes CSS customizadas

---

## 🔗 Integração com Landing Page

### Opção 1: Usar o Componente (se a landing for Next.js)

```tsx
// Na landing page
import CheckoutButton from "@/components/checkout/CheckoutButton"

export default function LandingPage() {
  return (
    <div>
      <h1>Almox Fácil</h1>
      <CheckoutButton>Começar Agora</CheckoutButton>
    </div>
  )
}
```

### Opção 2: Chamar API Diretamente (qualquer framework)

```javascript
// Botão na landing page
async function iniciarCheckout() {
  try {
    const response = await fetch('https://almoxfacil.alnog.com.br/api/create-checkout', {
      method: 'POST',
      credentials: 'include', // IMPORTANTE: incluir cookies
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.status === 401) {
      // Não autenticado - redirecionar para login
      window.location.href = 'https://almoxfacil.alnog.com.br/login'
      return
    }

    if (data.url) {
      // Redirecionar para Stripe Checkout
      window.location.href = data.url
    } else {
      alert('Erro ao iniciar checkout: ' + (data.error || 'Erro desconhecido'))
    }
  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao processar checkout')
  }
}

// No HTML
<button onclick="iniciarCheckout()">Assinar Agora</button>
```

### Opção 3: Link Direto (mais simples)

```html
<!-- Redireciona para login, depois para checkout -->
<a href="https://almoxfacil.alnog.com.br/login?redirect=checkout">
  Assinar Agora
</a>
```

---

## ⚙️ Variáveis de Ambiente Necessárias

Todas já estão configuradas no `.env.local`:

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
APP_URL=https://almoxfacil.alnog.com.br
NEXT_PUBLIC_APP_URL=https://almoxfacil.alnog.com.br
LANDING_URL=https://lp.alnog.com.br
NEXT_PUBLIC_LANDING_URL=https://lp.alnog.com.br

# Supabase (para webhook)
SUPABASE_URL=https://cmgmobhnrjawfdafhqko.supabase.co
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔐 Validação de Assinatura

### Status Atual: **Permissivo**

O sistema permite acesso mesmo sem assinatura ativa (para facilitar testes).

### Para Bloquear Acesso Sem Assinatura:

Edite `app/dashboard/layout.tsx` e descomente as linhas:

```tsx
// Descomentar estas linhas para bloquear acesso:
if (profile?.subscription_status !== 'active' && profile?.subscription_status !== 'trialing') {
  redirect("/upgrade")
}
```

---

## 📊 Status de Assinatura

Os status possíveis são:

- `inactive` - Sem assinatura
- `trialing` - Em período de trial (7 dias grátis)
- `active` - Assinatura ativa e paga
- `past_due` - Pagamento atrasado
- `canceled` - Assinatura cancelada

---

## 🧪 Testar Localmente

### 1. Usar Stripe Test Mode

No `.env.local`, use as chaves de teste:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### 2. Testar Webhook Localmente

Use o Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### 3. Cartão de Teste

Use: `4242 4242 4242 4242` (qualquer data futura, qualquer CVC)

---

## ✅ Checklist de Deploy

- [x] APIs de checkout criadas
- [x] Webhook configurado
- [x] Banco de dados com campos Stripe
- [x] Variáveis de ambiente configuradas
- [x] Componente React pronto
- [ ] Webhook configurado no Stripe Dashboard (produção)
- [ ] Testar fluxo completo em produção
- [ ] Configurar validação de assinatura (opcional)

---

## 🚀 Próximos Passos

1. **Configurar Webhook no Stripe:**
   - URL: `https://almoxfacil.alnog.com.br/api/stripe-webhook`
   - Eventos: todos os listados acima

2. **Testar Fluxo Completo:**
   - Criar conta
   - Iniciar checkout
   - Pagar com cartão de teste
   - Verificar se status foi atualizado

3. **Integrar com Landing Page:**
   - Adicionar botão CTA
   - Chamar `/api/create-checkout` ou usar componente

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do Stripe Dashboard
2. Verifique os logs do Vercel
3. Verifique o console do navegador
4. Verifique se todas as variáveis de ambiente estão configuradas

---

**🎉 Tudo pronto para processar pagamentos!**

