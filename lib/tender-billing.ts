import "server-only";
import Stripe from "stripe";
import { createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";

export const TENDER_PRODUCT_CODE = "tenders";
export const TENDER_SERVICE_NAME = "官公庁案件サーチ";
export const TENDER_TRIAL_DAYS = 14;
export const TENDER_MONTHLY_PRICE_YEN = 9800;
export const TENDER_MONTHLY_PRICE_TEXT = "月額9,800円（税込）";

export function hasTenderStripeEnv() {
  return Boolean(process.env.STRIPE_SECRET_KEY && getTenderStripePriceId() && process.env.NEXT_PUBLIC_APP_URL);
}

export function getTenderStripeSetupStatus() {
  return {
    hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasTenderPriceId: Boolean(getTenderStripePriceId()),
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL)
  };
}

export function getTenderStripePriceId() {
  return normalizeTenderStripeEnvValue(process.env.STRIPE_TENDER_PRICE_ID);
}

export function createTenderStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-05-27.dahlia",
    httpClient: Stripe.createFetchHttpClient()
  });
}

export type TenderStripePriceDiagnostics = {
  hasSecretKey: boolean;
  secretKeyMode: "live" | "test" | "unknown" | "missing";
  hasTenderPriceId: boolean;
  priceLookupOk: boolean;
  priceLivemode: boolean | null;
  modeMatches: boolean | null;
  productName: string | null;
  unitAmount: number | null;
  currency: string | null;
  recurringInterval: string | null;
  taxBehavior: string | null;
  active: boolean | null;
  expectedAmountMatches: boolean | null;
  expectedCurrencyMatches: boolean | null;
  expectedIntervalMatches: boolean | null;
  error: string | null;
};

export async function getTenderStripePriceDiagnostics(): Promise<TenderStripePriceDiagnostics> {
  const secretKeyMode = stripeSecretKeyMode(process.env.STRIPE_SECRET_KEY);
  const tenderPriceId = getTenderStripePriceId();
  const base: TenderStripePriceDiagnostics = {
    hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    secretKeyMode,
    hasTenderPriceId: Boolean(tenderPriceId),
    priceLookupOk: false,
    priceLivemode: null,
    modeMatches: null,
    productName: null,
    unitAmount: null,
    currency: null,
    recurringInterval: null,
    taxBehavior: null,
    active: null,
    expectedAmountMatches: null,
    expectedCurrencyMatches: null,
    expectedIntervalMatches: null,
    error: null
  };

  const stripe = createTenderStripeClient();
  if (!stripe || !tenderPriceId) {
    return { ...base, error: "Stripe Secret KeyまたはPrice IDが未設定です。" };
  }

  try {
    const price = await stripe.prices.retrieve(tenderPriceId, { expand: ["product"] });
    const productName = stripeProductName(price.product);
    const priceMode = price.livemode ? "live" : "test";
    return {
      ...base,
      priceLookupOk: true,
      priceLivemode: price.livemode,
      modeMatches: secretKeyMode === "unknown" || secretKeyMode === "missing" ? null : secretKeyMode === priceMode,
      productName,
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurringInterval: price.recurring?.interval ?? null,
      taxBehavior: price.tax_behavior ?? null,
      active: price.active,
      expectedAmountMatches: price.unit_amount === TENDER_MONTHLY_PRICE_YEN,
      expectedCurrencyMatches: price.currency === "jpy",
      expectedIntervalMatches: price.recurring?.interval === "month",
      error: null
    };
  } catch (error) {
    const stripeError = error as Partial<Stripe.StripeRawError> & { type?: string; code?: string; statusCode?: number; message?: string };
    return {
      ...base,
      error: [
        stripeError.type ? `type=${stripeError.type}` : null,
        stripeError.code ? `code=${stripeError.code}` : null,
        stripeError.statusCode ? `status=${stripeError.statusCode}` : null,
        sanitizeStripeDiagnosticMessage(stripeError.message ?? (error instanceof Error ? error.message : String(error)))
      ].filter(Boolean).join(" / ")
    };
  }
}

export async function getTenderPaymentEventDiagnostics() {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      total: null,
      checkoutCompleted: null,
      subscriptionCreated: null,
      subscriptionUpdated: null,
      invoicePaid: null,
      invoicePaymentFailed: null,
      latest: [] as TenderPaymentEventDiagnostic[],
      error: "TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。"
    };
  }

  const eventTypes = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "invoice.paid",
    "invoice.payment_failed"
  ];

  const [totalResult, latestResult, ...typeResults] = await Promise.all([
    supabase.from("tender_payment_events").select("id", { count: "exact", head: true }),
    supabase
      .from("tender_payment_events")
      .select("event_type,user_id,payment_customer_id,payment_subscription_id,processed_at,payload")
      .order("processed_at", { ascending: false })
      .limit(8),
    ...eventTypes.map((eventType) => supabase.from("tender_payment_events").select("id", { count: "exact", head: true }).eq("event_type", eventType))
  ]);

  const firstError = [totalResult, latestResult, ...typeResults].find((result) => result.error)?.error;
  if (firstError) {
    return {
      total: null,
      checkoutCompleted: null,
      subscriptionCreated: null,
      subscriptionUpdated: null,
      invoicePaid: null,
      invoicePaymentFailed: null,
      latest: [] as TenderPaymentEventDiagnostic[],
      error: firstError.message
    };
  }

  return {
    total: totalResult.count ?? 0,
    checkoutCompleted: typeResults[0].count ?? 0,
    subscriptionCreated: typeResults[1].count ?? 0,
    subscriptionUpdated: typeResults[2].count ?? 0,
    invoicePaid: typeResults[3].count ?? 0,
    invoicePaymentFailed: typeResults[4].count ?? 0,
    latest: ((latestResult.data ?? []) as RawTenderPaymentEvent[]).map(toTenderPaymentEventDiagnostic),
    error: null as string | null
  };
}

type RawTenderPaymentEvent = {
  event_type: string;
  user_id: string | null;
  payment_customer_id: string | null;
  payment_subscription_id: string | null;
  processed_at: string;
  payload: Record<string, unknown> | null;
};

export type TenderPaymentEventDiagnostic = {
  eventType: string;
  processedAt: string;
  hasUserId: boolean;
  hasCustomerId: boolean;
  hasSubscriptionId: boolean;
  productCode: string | null;
  objectStatus: string | null;
  subscriptionStatus: string | null;
};

function toTenderPaymentEventDiagnostic(row: RawTenderPaymentEvent): TenderPaymentEventDiagnostic {
  const object = eventObject(row.payload);
  const subscription = objectRecord(object?.subscription);
  return {
    eventType: row.event_type,
    processedAt: row.processed_at,
    hasUserId: Boolean(row.user_id),
    hasCustomerId: Boolean(row.payment_customer_id),
    hasSubscriptionId: Boolean(row.payment_subscription_id),
    productCode: eventProductCode(object),
    objectStatus: stringValue(object?.status),
    subscriptionStatus: stringValue(subscription?.status)
  };
}

function eventObject(payload: Record<string, unknown> | null) {
  const data = objectRecord(payload?.data);
  return objectRecord(data?.object);
}

function eventProductCode(object: Record<string, unknown> | null) {
  const metadata = objectRecord(object?.metadata);
  if (typeof metadata?.product_code === "string") return metadata.product_code;
  const subscriptionDetails = objectRecord(object?.subscription_details);
  const subscriptionMetadata = objectRecord(subscriptionDetails?.metadata);
  if (typeof subscriptionMetadata?.product_code === "string") return subscriptionMetadata.product_code;
  return null;
}

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function stripeSecretKeyMode(value: string | undefined): TenderStripePriceDiagnostics["secretKeyMode"] {
  if (!value) return "missing";
  if (value.startsWith("sk_live_")) return "live";
  if (value.startsWith("sk_test_")) return "test";
  return "unknown";
}

function stripeProductName(product: string | Stripe.Product | Stripe.DeletedProduct | null) {
  if (!product || typeof product === "string" || "deleted" in product) return null;
  return product.name ?? null;
}

function sanitizeStripeDiagnosticMessage(message: string) {
  return message
    .replace(/sk_(live|test)_[A-Za-z0-9_]+/g, "sk_$1_***")
    .replace(/whsec_[A-Za-z0-9_]+/g, "whsec_***")
    .replace(/price_[A-Za-z0-9_]+/g, "price_***")
    .replace(/cus_[A-Za-z0-9_]+/g, "cus_***")
    .replace(/sub_[A-Za-z0-9_]+/g, "sub_***")
    .slice(0, 500);
}

function normalizeTenderStripeEnvValue(value: string | undefined) {
  if (!value) return "";
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/^STRIPE_TENDER_PRICE_ID=/i, "")
    .replace(/^Value:/i, "")
    .trim();
}
