import Stripe from "stripe";
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    // Verificar autenticação do usuário
    const cookieStore = await cookies()
    
    // Verificar variáveis de ambiente obrigatórias
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor inválida." }), 
        { status: 500 }
      )
    }
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login primeiro." }), 
        { status: 401 }
      )
    }

    const body = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],

      line_items: [
        {
          // PRICE REAL do Almox Fácil
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],

      // 7 dias grátis
      subscription_data: {
        trial_period_days: 7,
      },

      // Associar checkout ao usuário (CRÍTICO!)
      client_reference_id: user.id,

      // Para onde o usuário vai depois de pagar
      success_url: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,

      // Para onde volta caso cancele antes de pagar
      cancel_url: `${process.env.LANDING_URL || process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3000'}/cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
    });

  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}

