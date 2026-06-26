import "server-only";
import { createStripeClient } from "@/lib/billing/stripe";

export const TENDER_PRODUCT_CODE = "tenders";
export const TENDER_SERVICE_NAME = "官公庁案件サーチ";
export const TENDER_TRIAL_DAYS = 14;
export const TENDER_MONTHLY_PRICE_YEN = 9800;
export const TENDER_MONTHLY_PRICE_TEXT = "月額9,800円（税込）";

export function hasTenderStripeEnv() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_TENDER_PRICE_ID && process.env.NEXT_PUBLIC_APP_URL);
}

export function getTenderStripeSetupStatus() {
  return {
    hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasTenderPriceId: Boolean(process.env.STRIPE_TENDER_PRICE_ID),
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL)
  };
}

export function createTenderStripeClient() {
  return createStripeClient();
}
