import Stripe from "stripe";

export const TRIAL_DAYS = 14;
export const MONTHLY_PRICE_YEN = 2980;

export function hasStripeEnv() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && process.env.NEXT_PUBLIC_APP_URL);
}

export function createStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-05-27.dahlia"
  });
}
