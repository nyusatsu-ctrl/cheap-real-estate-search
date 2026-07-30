import "server-only";
import Stripe from "stripe";
import {
  PROPERTY_MONTHLY_PRICE_YEN,
  PROPERTY_PLAN_CODE,
  PROPERTY_SERVICE_CODE,
  PROPERTY_TRIAL_DAYS
} from "@/lib/property-access";

export const TRIAL_DAYS = PROPERTY_TRIAL_DAYS;
export const MONTHLY_PRICE_YEN = PROPERTY_MONTHLY_PRICE_YEN;
export const PROPERTY_PRODUCT_NAME = "格安不動産サーチ 月額プラン";

export function hasStripeEnv() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY
    && getPropertyStripePriceId()
    && process.env.NEXT_PUBLIC_APP_URL
  );
}

export function createStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-05-27.dahlia",
    httpClient: Stripe.createFetchHttpClient()
  });
}

export function getPropertyStripePriceId() {
  return normalizeStripeEnvValue(process.env.STRIPE_PROPERTY_PRICE_ID);
}

export function propertyStripeMetadata(userId: string) {
  return {
    service: PROPERTY_SERVICE_CODE,
    user_id: userId,
    plan: PROPERTY_PLAN_CODE
  };
}

export function isPropertyStripeMetadata(metadata: Stripe.Metadata | null | undefined) {
  return metadata?.service === PROPERTY_SERVICE_CODE
    && metadata?.plan === PROPERTY_PLAN_CODE
    && Boolean(metadata?.user_id);
}

export async function validatePropertyStripePrice(stripe: Stripe, priceId: string) {
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  const productName = typeof price.product === "object" && "name" in price.product
    ? price.product.name
    : null;
  const valid = price.active
    && price.unit_amount === PROPERTY_MONTHLY_PRICE_YEN
    && price.currency === "jpy"
    && price.recurring?.interval === "month"
    && price.recurring.interval_count === 1
    && productName === PROPERTY_PRODUCT_NAME;

  return {
    valid,
    productName,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval ?? null,
    intervalCount: price.recurring?.interval_count ?? null,
    active: price.active,
    livemode: price.livemode
  };
}

function normalizeStripeEnvValue(value?: string) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
