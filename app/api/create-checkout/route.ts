import Stripe from "stripe"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder")

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    // Ler o body para obter o plano
    const body = await req.json()
    const { plan } = body

    // Definir Price ID com base no plano
    let priceId = process.env.STRIPE_PRICE_ID // Default (mensal ou o que estiver configurado)

    if (plan === "anual") {
      priceId = "price_1SaE6kGzXnyQEqRwIIX19uxm"
    } else if (plan === "mensal") {
      // Se tiver uma variável específica para mensal, use-a. 
      // Caso contrário, assume que STRIPE_PRICE_ID é o mensal.
      priceId = process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID
    }

    if (!process.env.STRIPE_SECRET_KEY || !priceId) {
      return NextResponse.json(
        { error: "Configuração do Stripe inválida (Price ID não encontrado)." },
        { status: 500 }
      )
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {
              // Cookie já definido
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {
              // Cookie não existe
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado. Faça login primeiro.", redirect: "/login?redirect=checkout" },
        { status: 401 }
      )
    }

    // Verificar se usuário já tem assinatura ativa
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .single()

    const activeStatuses = ["active", "trialing"]
    if (profile?.subscription_status && activeStatuses.includes(profile.subscription_status)) {
      return NextResponse.json(
        { error: "Você já possui uma assinatura ativa.", redirect: "/dashboard" },
        { status: 400 }
      )
    }

    // Buscar ou criar customer no Stripe
    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      // Criar novo customer no Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Salvar customer_id no profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
    }

    // Determinar URLs de sucesso e cancelamento
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // 7 dias de trial grátis
      subscription_data: {
        trial_period_days: 7,
      },
      // Associar checkout ao usuário (backup, além do customer)
      client_reference_id: user.id,
      // URLs de redirecionamento
      success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      // Configurações adicionais
      allow_promotion_codes: true,
      billing_address_collection: "required",
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Erro ao criar sessão de checkout" },
      { status: 500 }
    )
  }
}

