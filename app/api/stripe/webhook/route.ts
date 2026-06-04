import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createStripeClient } from "@/lib/billing/stripe";

export async function POST(request: NextRequest) {
  const stripe = createStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripe || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Webhook environment is not configured." }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;

    if (userId) {
      await supabase.from("profiles").update({
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        subscription_status: "trialing"
      }).eq("id", userId);
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const userId = subscription.metadata?.user_id;

    if (userId) {
      await supabase.from("profiles").update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
      }).eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
