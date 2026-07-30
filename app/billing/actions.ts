"use server";

import { redirect } from "next/navigation";
import {
  createStripeClient,
  getPropertyStripePriceId,
  hasStripeEnv,
  propertyStripeMetadata,
  validatePropertyStripePrice
} from "@/lib/billing/stripe";
import { requireMember } from "@/lib/user";

export async function startCheckoutAction() {
  if (!hasStripeEnv()) redirect("/billing?demo=1");

  const member = await requireMember();
  const stripe = createStripeClient();
  const priceId = getPropertyStripePriceId();
  if (!stripe || !priceId) redirect("/billing?demo=1");

  if (
    member.stripeSubscriptionId
    && ["active", "past_due", "unpaid", "incomplete", "paused"].includes(member.subscriptionStatus)
  ) {
    redirect("/billing?error=manage_existing");
  }

  try {
    const price = await validatePropertyStripePrice(stripe, priceId);
    if (!price.valid) redirect("/billing?error=price_mismatch");

    const metadata = propertyStripeMetadata(member.id);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(member.stripeCustomerId
        ? { customer: member.stripeCustomerId }
        : { customer_email: member.email }),
      client_reference_id: member.id,
      line_items: [{ price: priceId, quantity: 1 }],
      locale: "ja",
      subscription_data: { metadata },
      metadata,
      custom_text: {
        submit: {
          message: "お申し込み時に月額4,980円（税込）を決済し、以後毎月自動更新されます。解約は契約管理画面から行えます。"
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancelled`
    });

    if (!session.url) redirect("/billing?error=checkout");
    redirect(session.url);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("[property-billing] failed to create checkout session");
    redirect("/billing?error=checkout");
  }
}

export async function openCustomerPortalAction() {
  if (!hasStripeEnv()) redirect("/billing?demo=1");

  const member = await requireMember();
  const stripe = createStripeClient();
  if (!stripe || !member.stripeCustomerId) redirect("/billing?error=portal_unavailable");

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    });
    redirect(session.url);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("[property-billing] failed to create customer portal session");
    redirect("/billing?error=portal");
  }
}

function isNextRedirect(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "digest" in error
    && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
