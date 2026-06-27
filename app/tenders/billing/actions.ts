"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { createTenderStripeClient, hasTenderStripeEnv, TENDER_PRODUCT_CODE } from "@/lib/tender-billing";
import { requireTenderMemberAccess } from "@/lib/tender-access";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function startTenderCheckoutAction() {
  const access = await requireTenderMemberAccess();
  if (access.subscriptionStatus === "admin") redirect("/tenders");
  if (!hasTenderStripeEnv()) redirect("/tenders/billing?setup=stripe");

  const stripe = createTenderStripeClient();
  if (!stripe) redirect("/tenders/billing?setup=stripe");

  let sessionUrl: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: access.paymentCustomerId ?? undefined,
      customer_email: access.paymentCustomerId ? undefined : access.email,
      line_items: [{ price: process.env.STRIPE_TENDER_PRICE_ID!, quantity: 1 }],
      metadata: {
        product_code: TENDER_PRODUCT_CODE,
        user_id: access.userId
      },
      subscription_data: {
        metadata: {
          product_code: TENDER_PRODUCT_CODE,
          user_id: access.userId
        }
      },
      success_url: `${appUrl()}/tenders/billing?checkout=success`,
      cancel_url: `${appUrl()}/tenders/billing?checkout=cancelled`
    });
    sessionUrl = session.url;
  } catch (error) {
    const checkoutError = classifyTenderCheckoutError(error);
    console.error("[tender-checkout] failed to create checkout session", {
      reason: checkoutError.reason,
      stripeType: checkoutError.stripeType,
      stripeCode: checkoutError.stripeCode,
      statusCode: checkoutError.statusCode,
      requestId: checkoutError.requestId,
      message: checkoutError.message
    });
    redirect(`/tenders/billing?error=${checkoutError.reason}`);
  }

  if (!sessionUrl) redirect("/tenders/billing?error=checkout");
  redirect(sessionUrl);
}

type TenderCheckoutError = {
  reason: string;
  stripeType: string | null;
  stripeCode: string | null;
  statusCode: number | null;
  requestId: string | null;
  message: string;
};

function classifyTenderCheckoutError(error: unknown): TenderCheckoutError {
  const stripeError = error as Partial<Stripe.StripeRawError> & {
    type?: string;
    code?: string;
    statusCode?: number;
    requestId?: string;
    message?: string;
  };
  const message = sanitizeStripeErrorMessage(stripeError.message ?? (error instanceof Error ? error.message : String(error)));
  const rawMessage = stripeError.message ?? "";
  const code = stripeError.code ?? null;
  const type = stripeError.type ?? null;
  const statusCode = stripeError.statusCode ?? null;
  const requestId = stripeError.requestId ?? null;

  let reason = "checkout";
  if (type === "authentication_error" || code === "api_key_expired") {
    reason = "stripe_auth";
  } else if (/No such price|price/i.test(rawMessage) && /No such|not found|does not exist|resource_missing/i.test(rawMessage)) {
    reason = "stripe_price";
  } else if (/No such customer|customer/i.test(rawMessage) && /No such|not found|does not exist|resource_missing/i.test(rawMessage)) {
    reason = "stripe_customer";
  } else if (/success_url|cancel_url|url/i.test(rawMessage) && /invalid|not a valid/i.test(rawMessage)) {
    reason = "stripe_url";
  } else if (code === "resource_missing") {
    reason = "stripe_resource";
  }

  return {
    reason,
    stripeType: type,
    stripeCode: code,
    statusCode,
    requestId,
    message
  };
}

function sanitizeStripeErrorMessage(message: string) {
  return message
    .replace(/sk_(live|test)_[A-Za-z0-9_]+/g, "sk_$1_***")
    .replace(/whsec_[A-Za-z0-9_]+/g, "whsec_***")
    .replace(/price_[A-Za-z0-9_]+/g, "price_***")
    .replace(/cus_[A-Za-z0-9_]+/g, "cus_***")
    .replace(/sub_[A-Za-z0-9_]+/g, "sub_***")
    .slice(0, 500);
}

export async function openTenderCustomerPortalAction() {
  const access = await requireTenderMemberAccess();
  if (!access.paymentCustomerId) redirect("/tenders/billing?error=no_customer");

  const stripe = createTenderStripeClient();
  if (!stripe) redirect("/tenders/billing?setup=stripe");

  let sessionUrl: string | null = null;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: access.paymentCustomerId,
      return_url: `${appUrl()}/tenders/billing`
    });
    sessionUrl = session.url;
  } catch (error) {
    const portalError = classifyTenderCheckoutError(error);
    console.error("[tender-customer-portal] failed to create portal session", {
      reason: portalError.reason,
      stripeType: portalError.stripeType,
      stripeCode: portalError.stripeCode,
      statusCode: portalError.statusCode,
      requestId: portalError.requestId,
      message: portalError.message
    });
    redirect(`/tenders/billing?error=${portalError.reason}`);
  }

  if (!sessionUrl) redirect("/tenders/billing?error=portal");
  redirect(sessionUrl);
}
