"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createStripeClient, hasStripeEnv } from "@/lib/billing/stripe";

export async function startCheckoutAction() {
  if (!hasStripeEnv()) redirect("/billing?demo=1");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/billing?demo=1");

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const stripe = createStripeClient();
  if (!stripe) redirect("/billing?demo=1");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      metadata: { user_id: user.id }
    },
    metadata: { user_id: user.id },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancelled`
  });

  if (!session.url) redirect("/billing?error=checkout");
  redirect(session.url);
}
