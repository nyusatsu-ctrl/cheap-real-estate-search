import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { createStripeClient } from "@/lib/billing/stripe";
import { createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { emailHash } from "@/lib/tender-access";
import { createTenderStripeClient, TENDER_PRODUCT_CODE } from "@/lib/tender-billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = createTenderStripeClient() ?? createStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
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

  try {
    const tenderHandled = await handleTenderStripeEvent(event);
    if (tenderHandled) return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[tender-stripe-webhook] failed to process tender event", {
      eventType: event.type,
      message: error instanceof Error ? sanitizeStripeLogMessage(error.message) : "unknown_error"
    });
    return NextResponse.json({ error: "Tender webhook processing failed." }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Webhook environment is not configured." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;

    if (userId) {
      await supabase.from("profiles").update({
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        subscription_status: "active",
        trial_ends_at: null
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

async function handleTenderStripeEvent(event: Stripe.Event) {
  const productCode = stripeEventProductCode(event);
  if (productCode !== TENDER_PRODUCT_CODE) return false;

  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error("TENDER_SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  const paymentEvent = {
    event_id: event.id,
    event_type: event.type,
    user_id: stripeEventUserId(event),
    payment_customer_id: stripeEventCustomerId(event),
    payment_subscription_id: stripeEventSubscriptionId(event),
    payload: event as unknown as Record<string, unknown>
  };
  const inserted = await supabase.from("tender_payment_events").insert(paymentEvent);
  if (inserted.error) {
    if (!isUniqueViolation(inserted.error.code)) {
      throw new Error(`failed to save payment event: ${inserted.error.message}`);
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    if (!userId) return true;

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const currentPeriodEnd = subscriptionId ? await fetchSubscriptionPeriodEnd(subscriptionId) : null;
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const { error } = await upsertTenderStripeAccess({
      userId,
      email,
      status: "active",
      customerId: typeof session.customer === "string" ? session.customer : null,
      subscriptionId,
      currentPeriodEnd,
      cancelAtPeriodEnd: false
    });
    if (error) logTenderWebhookUpdateError(event.type, error);
    return true;
  }

  if (
    event.type === "customer.subscription.created"
    || event.type === "customer.subscription.updated"
    || event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    const userId = subscription.metadata?.user_id;
    const { error } = userId
      ? await upsertTenderStripeAccess({
        userId,
        email: null,
        status: mapTenderSubscriptionStatus(subscription.status),
        customerId: typeof subscription.customer === "string" ? subscription.customer : null,
        subscriptionId: subscription.id,
        currentPeriodEnd: subscriptionPeriodEnd(subscription),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
      })
      : await supabase
        .from("tender_user_access")
        .update({
          subscription_status: mapTenderSubscriptionStatus(subscription.status),
          payment_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
          payment_subscription_id: subscription.id,
          current_period_end: subscriptionPeriodEnd(subscription),
          cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
          billing_source: "stripe"
        })
        .eq("payment_subscription_id", subscription.id)
        .eq("product_code", TENDER_PRODUCT_CODE);
    if (error) logTenderWebhookUpdateError(event.type, error);
    return true;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (!subscriptionId) return true;

    const { error } = await supabase
      .from("tender_user_access")
      .update({
        subscription_status: event.type === "invoice.paid" ? "active" : "past_due",
        billing_source: "stripe"
      })
      .eq("payment_subscription_id", subscriptionId)
      .eq("product_code", TENDER_PRODUCT_CODE);
    if (error) logTenderWebhookUpdateError(event.type, error);
    return true;
  }

  return true;
}

async function upsertTenderStripeAccess({
  userId,
  email,
  status,
  customerId,
  subscriptionId,
  currentPeriodEnd,
  cancelAtPeriodEnd
}: {
  userId: string;
  email: string | null;
  status: "active" | "past_due" | "canceled";
  customerId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return { error: { message: "TENDER_SUPABASE_SERVICE_ROLE_KEY is not configured." } };

  const { data: existing, error: lookupError } = await supabase
    .from("tender_user_access")
    .select("id")
    .eq("user_id", userId)
    .eq("product_code", TENDER_PRODUCT_CODE)
    .maybeSingle();
  if (lookupError) return { error: lookupError };

  const payload = {
    subscription_status: status,
    payment_customer_id: customerId,
    payment_subscription_id: subscriptionId,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    billing_source: "stripe"
  };

  if (existing?.id) {
    return supabase
      .from("tender_user_access")
      .update(email ? { ...payload, email, email_hash: emailHash(email) } : payload)
      .eq("id", existing.id);
  }

  if (!email) {
    return {
      error: {
        message: "Cannot create tender_user_access without customer email."
      }
    };
  }

  return supabase
    .from("tender_user_access")
    .insert({
      user_id: userId,
      email,
      email_hash: emailHash(email),
      product_code: TENDER_PRODUCT_CODE,
      ...payload
    });
}

function stripeEventProductCode(event: Stripe.Event) {
  const object = event.data.object;
  if ("metadata" in object && object.metadata?.product_code) return object.metadata.product_code;
  const subscriptionDetails = "subscription_details" in object ? object.subscription_details : null;
  if (subscriptionDetails && typeof subscriptionDetails === "object" && "metadata" in subscriptionDetails) {
    const metadata = (subscriptionDetails as { metadata?: Stripe.Metadata | null }).metadata;
    if (metadata?.product_code) return metadata.product_code;
  }
  return null;
}

function stripeEventUserId(event: Stripe.Event) {
  const object = event.data.object;
  if ("metadata" in object && object.metadata?.user_id) return object.metadata.user_id;
  const subscriptionDetails = "subscription_details" in object ? object.subscription_details : null;
  if (subscriptionDetails && typeof subscriptionDetails === "object" && "metadata" in subscriptionDetails) {
    const metadata = (subscriptionDetails as { metadata?: Stripe.Metadata | null }).metadata;
    if (metadata?.user_id) return metadata.user_id;
  }
  return null;
}

function stripeEventCustomerId(event: Stripe.Event) {
  const object = event.data.object;
  if ("customer" in object && typeof object.customer === "string") return object.customer;
  return null;
}

function stripeEventSubscriptionId(event: Stripe.Event) {
  const object = event.data.object;
  if (event.type.startsWith("customer.subscription.") && "id" in object && typeof object.id === "string") return object.id;
  if ("subscription" in object) {
    const subscription = object.subscription;
    if (typeof subscription === "string") return subscription;
    if (subscription && typeof subscription === "object" && "id" in subscription && typeof subscription.id === "string") return subscription.id;
  }
  if (event.type.startsWith("invoice.") && "lines" in object) return invoiceSubscriptionId(object as Stripe.Invoice);
  return null;
}

async function fetchSubscriptionPeriodEnd(subscriptionId: string) {
  const stripe = createTenderStripeClient();
  if (!stripe) return null;
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscriptionPeriodEnd(subscription);
  } catch (error) {
    console.error("[tender-stripe-webhook] failed to retrieve subscription", {
      subscriptionId,
      message: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>) {
  const value = (subscription as unknown as { current_period_end?: number | null }).current_period_end;
  return value ? new Date(value * 1000).toISOString() : null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const direct = (invoice as unknown as { subscription?: string | { id?: string } | null }).subscription;
  if (typeof direct === "string") return direct;
  if (direct?.id) return direct.id;

  const lineSubscription = (invoice as unknown as {
    lines?: { data?: Array<{ parent?: { subscription_item_details?: { subscription?: string | null } } }> };
  }).lines?.data?.find((line) => line.parent?.subscription_item_details?.subscription)?.parent?.subscription_item_details?.subscription;
  return lineSubscription ?? null;
}

function mapTenderSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled") return "canceled";
  return "past_due";
}

function isUniqueViolation(code?: string) {
  return code === "23505";
}

function logTenderWebhookUpdateError(eventType: string, error: { code?: string; message: string }) {
  console.error("[tender-stripe-webhook] failed to update tender access", {
    eventType,
    code: error.code,
    message: sanitizeStripeLogMessage(error.message)
  });
}

function sanitizeStripeLogMessage(message: string) {
  return message
    .replace(/sk_(live|test)_[A-Za-z0-9_]+/g, "sk_$1_***")
    .replace(/whsec_[A-Za-z0-9_]+/g, "whsec_***")
    .replace(/price_[A-Za-z0-9_]+/g, "price_***")
    .replace(/cus_[A-Za-z0-9_]+/g, "cus_***")
    .replace(/sub_[A-Za-z0-9_]+/g, "sub_***")
    .slice(0, 500);
}
