import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  createStripeClient,
  getPropertyStripePriceId,
  isPropertyStripeMetadata
} from "@/lib/billing/stripe";
import { createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { emailHash, type TenderSubscriptionStatus } from "@/lib/tender-access";
import { createTenderStripeClient, getTenderStripePriceId, TENDER_PRODUCT_CODE } from "@/lib/tender-billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = createTenderStripeClient() ?? createStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({
      error: "Webhook environment is not configured.",
      missing: [
        stripe ? null : "STRIPE_SECRET_KEY",
        webhookSecret ? null : "STRIPE_WEBHOOK_SECRET"
      ].filter(Boolean)
    }, { status: 500 });
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

  try {
    const propertyHandled = await handlePropertyStripeEvent(event);
    return NextResponse.json({ received: true, ignored: !propertyHandled });
  } catch (error) {
    console.error("[property-stripe-webhook] failed to process property event", {
      eventType: event.type,
      message: error instanceof Error ? sanitizeStripeLogMessage(error.message) : "unknown_error"
    });
    return NextResponse.json({ error: "Property webhook processing failed." }, { status: 500 });
  }
}

async function handlePropertyStripeEvent(event: Stripe.Event) {
  if (!isSupportedPropertyEvent(event.type)) return false;

  const stripe = createStripeClient();
  const priceId = getPropertyStripePriceId();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripe || !priceId || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Property billing environment is not configured.");
  }

  const context = await getPropertyEventContext(event, stripe, priceId);
  if (!context) return false;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  const { data: processed } = await supabase
    .from("property_payment_events")
    .select("processed_at")
    .eq("event_id", event.id)
    .maybeSingle();
  if (processed?.processed_at) return true;

  if (!processed) {
    const inserted = await supabase.from("property_payment_events").insert({
      event_id: event.id,
      event_type: event.type,
      user_id: context.userId,
      stripe_customer_id: context.customerId,
      stripe_subscription_id: context.subscriptionId
    });
    if (inserted.error && !isUniqueViolation(inserted.error.code)) {
      throw new Error(`failed to save property payment event: ${inserted.error.message}`);
    }
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", context.userId)
      .single();
    if (profileError || !profile) throw new Error("Property billing profile was not found.");
    if (profile.stripe_customer_id && profile.stripe_customer_id !== context.customerId) {
      throw new Error("Stripe customer does not match the property billing profile.");
    }

    const update = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: context.customerId,
        stripe_subscription_id: context.subscriptionId,
        subscription_status: context.status,
        current_period_end: context.currentPeriodEnd,
        cancel_at_period_end: context.cancelAtPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq("id", context.userId);
    if (update.error) throw new Error(`failed to update property access: ${update.error.message}`);

    const completed = await supabase
      .from("property_payment_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.id);
    if (completed.error) throw new Error(`failed to complete property payment event: ${completed.error.message}`);
    return true;
  } catch (error) {
    await supabase.from("property_payment_events").delete().eq("event_id", event.id);
    throw error;
  }
}

type PropertyEventContext = {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

async function getPropertyEventContext(
  event: Stripe.Event,
  stripe: Stripe,
  expectedPriceId: string
): Promise<PropertyEventContext | null> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (!isPropertyStripeMetadata(session.metadata)) return null;
    const subscriptionId = stringId(session.subscription);
    if (!subscriptionId) throw new Error("Property checkout has no subscription.");
    return getVerifiedPropertySubscription(stripe, subscriptionId, expectedPriceId, session.metadata?.user_id);
  }

  if (
    event.type === "customer.subscription.created"
    || event.type === "customer.subscription.updated"
    || event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    if (!isPropertyStripeMetadata(subscription.metadata)) return null;
    return propertySubscriptionContext(subscription, expectedPriceId);
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (!subscriptionId) return null;
    const context = await getVerifiedPropertySubscription(stripe, subscriptionId, expectedPriceId);
    if (!context) return null;
    return event.type === "invoice.payment_failed"
      ? { ...context, status: "past_due" }
      : context;
  }

  return null;
}

async function getVerifiedPropertySubscription(
  stripe: Stripe,
  subscriptionId: string,
  expectedPriceId: string,
  expectedUserId?: string
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!isPropertyStripeMetadata(subscription.metadata)) return null;
  if (expectedUserId && subscription.metadata.user_id !== expectedUserId) {
    throw new Error("Property checkout user does not match subscription metadata.");
  }
  return propertySubscriptionContext(subscription, expectedPriceId);
}

function propertySubscriptionContext(
  subscription: Stripe.Subscription,
  expectedPriceId: string
): PropertyEventContext {
  if (!isPropertyStripeMetadata(subscription.metadata)) {
    throw new Error("Property subscription metadata is missing.");
  }
  if (!subscription.items.data.some((item) => item.price.id === expectedPriceId)) {
    throw new Error("Property subscription price does not match the configured price.");
  }

  const customerId = stringId(subscription.customer);
  if (!customerId) throw new Error("Property subscription customer is missing.");
  return {
    userId: subscription.metadata.user_id,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscriptionPeriodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
  };
}

function isSupportedPropertyEvent(type: string) {
  return [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed"
  ].includes(type);
}

function stringId(value: string | { id?: string } | null) {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}

async function handleTenderStripeEvent(event: Stripe.Event) {
  if (!(await isTenderStripeEvent(event))) return false;

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
    const userId = session.metadata?.user_id ?? null;

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const subscriptionSnapshot = subscriptionId ? await fetchSubscriptionSnapshot(subscriptionId) : null;
    const email = session.customer_details?.email ?? session.customer_email ?? null;
    const { error } = await upsertTenderStripeAccess({
      userId,
      email,
      status: subscriptionSnapshot?.status ?? "active",
      customerId: typeof session.customer === "string" ? session.customer : null,
      subscriptionId,
      currentPeriodEnd: subscriptionSnapshot?.currentPeriodEnd ?? null,
      trialEndsAt: subscriptionSnapshot?.trialEndsAt ?? null,
      cancelAtPeriodEnd: subscriptionSnapshot?.cancelAtPeriodEnd ?? false
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
        trialEndsAt: subscriptionTrialEnd(subscription),
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
      })
      : await supabase
        .from("tender_user_access")
        .update({
          subscription_status: mapTenderSubscriptionStatus(subscription.status),
          payment_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
          payment_subscription_id: subscription.id,
          current_period_end: subscriptionPeriodEnd(subscription),
          trial_ends_at: subscriptionTrialEnd(subscription),
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
    const subscriptionSnapshot = await fetchSubscriptionSnapshot(subscriptionId);
    if (event.type === "invoice.paid" && !subscriptionSnapshot && invoiceAmountPaid(invoice) <= 0) return true;

    const { error } = await supabase
      .from("tender_user_access")
      .update({
        subscription_status: event.type === "invoice.paid" ? subscriptionSnapshot?.status ?? "active" : "past_due",
        billing_source: "stripe",
        current_period_end: subscriptionSnapshot?.currentPeriodEnd ?? undefined,
        trial_ends_at: subscriptionSnapshot?.trialEndsAt ?? undefined,
        cancel_at_period_end: subscriptionSnapshot?.cancelAtPeriodEnd ?? undefined
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
  trialEndsAt,
  cancelAtPeriodEnd
}: {
  userId: string | null;
  email: string | null;
  status: TenderStripeAccessStatus;
  customerId: string | null;
  subscriptionId: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return { error: { message: "TENDER_SUPABASE_SERVICE_ROLE_KEY is not configured." } };

  const email_hash = email ? emailHash(email) : null;
  const lookup = supabase
    .from("tender_user_access")
    .select("id")
    .eq("product_code", TENDER_PRODUCT_CODE);
  const { data: existing, error: lookupError } = userId
    ? await lookup.eq("user_id", userId).maybeSingle()
    : email_hash
      ? await lookup.eq("email_hash", email_hash).maybeSingle()
      : { data: null, error: null };
  if (lookupError) return { error: lookupError };

  const payload = {
    subscription_status: status,
    payment_customer_id: customerId,
    payment_subscription_id: subscriptionId,
    current_period_end: currentPeriodEnd,
    trial_ends_at: trialEndsAt,
    cancel_at_period_end: cancelAtPeriodEnd,
    billing_source: "stripe"
  };

  if (existing?.id) {
    return supabase
      .from("tender_user_access")
      .update(email_hash ? { ...payload, email, email_hash } : payload)
      .eq("id", existing.id);
  }

  if (!userId || !email || !email_hash) {
    return {
      error: {
        message: "Cannot create tender_user_access without user id and customer email."
      }
    };
  }

  return supabase
    .from("tender_user_access")
    .insert({
      user_id: userId,
      email,
      email_hash,
      product_code: TENDER_PRODUCT_CODE,
      ...payload
    });
}

async function isTenderStripeEvent(event: Stripe.Event) {
  if (stripeEventProductCode(event) === TENDER_PRODUCT_CODE) return true;
  if (stripeEventHasTenderPrice(event)) return true;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    return checkoutSessionHasTenderPrice(session.id);
  }

  const subscriptionId = stripeEventSubscriptionId(event);
  if (subscriptionId) return subscriptionBelongsToTenderAccess(subscriptionId);

  return false;
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

function stripeEventHasTenderPrice(event: Stripe.Event) {
  const priceId = getTenderStripePriceId();
  if (!priceId) return false;
  return collectStringValues(event.data.object, "id").includes(priceId);
}

async function checkoutSessionHasTenderPrice(sessionId: string) {
  const priceId = getTenderStripePriceId();
  const stripe = createTenderStripeClient();
  if (!priceId || !stripe) return false;
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 10 });
    return lineItems.data.some((item) => item.price?.id === priceId);
  } catch (error) {
    console.error("[tender-stripe-webhook] failed to inspect checkout line items", {
      message: error instanceof Error ? sanitizeStripeLogMessage(error.message) : "unknown_error"
    });
    return false;
  }
}

async function subscriptionBelongsToTenderAccess(subscriptionId: string) {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return false;
  const { count, error } = await supabase
    .from("tender_user_access")
    .select("id", { count: "exact", head: true })
    .eq("product_code", TENDER_PRODUCT_CODE)
    .eq("payment_subscription_id", subscriptionId);
  if (error) {
    console.error("[tender-stripe-webhook] failed to inspect subscription owner", {
      message: sanitizeStripeLogMessage(error.message)
    });
    return false;
  }
  return Boolean(count);
}

function collectStringValues(value: unknown, key: string, depth = 0): string[] {
  if (!value || depth > 6) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectStringValues(item, key, depth + 1));
  if (typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([entryKey, entryValue]) => {
    const own = entryKey === key && typeof entryValue === "string" ? [entryValue] : [];
    return own.concat(collectStringValues(entryValue, key, depth + 1));
  });
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

type TenderStripeAccessStatus = Extract<TenderSubscriptionStatus, "trialing" | "active" | "past_due" | "canceled">;

type SubscriptionSnapshot = {
  status: TenderStripeAccessStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
};

async function fetchSubscriptionSnapshot(subscriptionId: string): Promise<SubscriptionSnapshot | null> {
  const stripe = createTenderStripeClient();
  if (!stripe) return null;
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      status: mapTenderSubscriptionStatus(subscription.status),
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
      trialEndsAt: subscriptionTrialEnd(subscription),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end)
    };
  } catch (error) {
    console.error("[tender-stripe-webhook] failed to retrieve subscription", {
      hasSubscriptionId: Boolean(subscriptionId),
      message: error instanceof Error ? sanitizeStripeLogMessage(error.message) : "unknown_error"
    });
    return null;
  }
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>) {
  const typed = subscription as unknown as {
    current_period_end?: number | null;
    items?: { data?: Array<{ current_period_end?: number | null }> };
  };
  const value = typed.current_period_end
    ?? typed.items?.data
      ?.map((item) => item.current_period_end ?? 0)
      .reduce((latest, current) => Math.max(latest, current), 0);
  return value ? new Date(value * 1000).toISOString() : null;
}

function subscriptionTrialEnd(subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>) {
  const value = (subscription as unknown as { trial_end?: number | null }).trial_end;
  return value ? new Date(value * 1000).toISOString() : null;
}

function invoiceAmountPaid(invoice: Stripe.Invoice) {
  return (invoice as unknown as { amount_paid?: number | null }).amount_paid ?? 0;
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
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
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
