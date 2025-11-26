import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
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

      // Para onde o usuário vai depois de pagar
      success_url: `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,

      // Para onde volta caso cancele antes de pagar
      cancel_url: `${process.env.LANDING_URL}/cancelled`,
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

