import Stripe from "stripe"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from "zod"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

import { validateCheckoutBody, getPriceId } from "./helpers"

const messages = {
  pt: {
    configError: "Erro de configuração do servidor.",
    authError: "Não autorizado. Faça login primeiro.",
    activeSub: "Você já possui uma assinatura ativa.",
    checkoutError: "Erro ao criar sessão de checkout",
  },
  en: {
    configError: "Server configuration error.",
    authError: "Unauthorized. Please login first.",
    activeSub: "You already have an active subscription.",
    checkoutError: "Error creating checkout session",
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const body = await req.json()

    // Validação com Zod
    const result = validateCheckoutBody(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: result.error.format() },
        { status: 400 }
      )
    }

    const { plan, locale } = result.data
    // Normalizar locale para pt ou en
    const lang = locale.startsWith("en") ? "en" : "pt"
    const t = messages[lang]

    // Definir Price ID via variáveis de ambiente
    const priceId = getPriceId(plan, process.env as Record<string, string>)

    if (!process.env.STRIPE_SECRET_KEY || !priceId) {
      console.error("Missing Stripe config:", {
        hasSecret: !!process.env.STRIPE_SECRET_KEY,
        priceId,
        plan
      })
      return NextResponse.json(
        { error: t.configError },
        { status: 500 }
      )
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
        { error: t.authError, redirect: "/login?redirect=checkout" },
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
        { error: t.activeSub, redirect: "/dashboard" },
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
      locale: lang === "pt" ? "pt-BR" : "en",
    })

    return NextResponse.json({ url: session.url })

  } catch (error: any) {
    console.error("Checkout error:", error)
    // Tentar determinar o idioma mesmo em caso de erro catastrófico
    return NextResponse.json(
      { error: "Erro ao processar checkout" }, // Fallback genérico
      { status: 500 }
    )
  }
}

