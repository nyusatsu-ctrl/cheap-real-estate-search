import "server-only";
import Stripe from "stripe";

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
