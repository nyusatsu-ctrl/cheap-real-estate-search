"use server";

import { redirect } from "next/navigation";
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

  if (!session.url) redirect("/tenders/billing?error=checkout");
  redirect(session.url);
}

export async function openTenderCustomerPortalAction() {
  const access = await requireTenderMemberAccess();
  if (!access.paymentCustomerId) redirect("/tenders/billing?error=no_customer");

  const stripe = createTenderStripeClient();
  if (!stripe) redirect("/tenders/billing?setup=stripe");

  const session = await stripe.billingPortal.sessions.create({
    customer: access.paymentCustomerId,
    return_url: `${appUrl()}/tenders/billing`
  });

  redirect(session.url);
}
