import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Desabilitar body parsing para esta rota (necessário para webhooks do Stripe)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  // Ler o body como texto raw (necessário para validação do Stripe)
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  // Criar cliente Supabase com service role (bypass RLS)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Atualizar profile com customer_id e status
        const { error } = await supabase
          .from("profiles")
          .update({
            stripe_customer_id: session.customer,
            subscription_status: "active",
          })
          .eq("id", session.client_reference_id);

        if (error) {
          console.error("Erro ao atualizar profile no checkout:", error);
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
          })
          .eq("stripe_customer_id", invoice.customer);

        if (error) {
          console.error("Erro ao atualizar profile no pagamento:", error);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "past_due",
          })
          .eq("stripe_customer_id", invoice.customer);

        if (error) {
          console.error("Erro ao atualizar profile no pagamento falho:", error);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", sub.customer);

        if (error) {
          console.error("Erro ao atualizar profile na cancelamento:", error);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;

        // Atualizar status baseado no status da subscription do Stripe
        let status = "inactive";
        if (subscription.status === "active") {
          status = "active";
        } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
          status = "past_due";
        } else if (subscription.status === "canceled") {
          status = "canceled";
        } else if (subscription.status === "trialing") {
          status = "trialing";
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: status,
          })
          .eq("stripe_customer_id", subscription.customer);

        if (error) {
          console.error("Erro ao atualizar profile na atualização de subscription:", error);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Erro ao processar webhook:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar webhook" }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

