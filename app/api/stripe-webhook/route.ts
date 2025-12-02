import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import { NextResponse, NextRequest } from "next/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder")

// Desabilitar body parsing para esta rota (necessário para webhooks do Stripe)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Ler o body como texto raw (necessário para validação do Stripe)
  const rawBody = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado")
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
    )
  }

  // Criar cliente Supabase com service role (bypass RLS)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    console.error("Supabase environment variables not configured")
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    )
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  )

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.client_reference_id) {
          // Atualizar profile com customer_id e status
          const { error } = await supabase
            .from("profiles")
            .update({
              stripe_customer_id: session.customer as string,
              subscription_status: session.subscription ? "trialing" : "active",
            })
            .eq("id", session.client_reference_id)

          if (error) {
            console.error("Erro ao atualizar profile no checkout:", error)
          } else {
            console.log(`Profile ${session.client_reference_id} atualizado com sucesso`)
          }
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        // Mapear status do Stripe para nosso status
        let status = "inactive"
        switch (subscription.status) {
          case "active":
            status = "active"
            break
          case "trialing":
            status = "trialing"
            break
          case "past_due":
          case "unpaid":
            status = "past_due"
            break
          case "canceled":
          case "incomplete_expired":
            status = "canceled"
            break
          default:
            status = "inactive"
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: status,
          })
          .eq("stripe_customer_id", subscription.customer as string)

        if (error) {
          console.error("Erro ao atualizar profile na subscription:", error)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
          })
          .eq("stripe_customer_id", invoice.customer as string)

        if (error) {
          console.error("Erro ao atualizar profile no pagamento:", error)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "past_due",
          })
          .eq("stripe_customer_id", invoice.customer as string)

        if (error) {
          console.error("Erro ao atualizar profile no pagamento falho:", error)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", subscription.customer as string)

        if (error) {
          console.error("Erro ao atualizar profile no cancelamento:", error)
        }
        break
      }

      default:
        console.log(`Evento não tratado: ${event.type}`)
    }
  } catch (err) {
    console.error("Erro ao processar webhook:", err)
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    )
  }

  return NextResponse.json({ received: true })
}

