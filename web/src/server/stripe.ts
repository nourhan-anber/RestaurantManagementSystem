import Stripe from 'stripe';

let cached: Stripe | null = null;

/** The Stripe client, or null when billing isn't configured (no secret key). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  cached ??= new Stripe(key);
  return cached;
}

/** Billing is fully configured (can start checkout) when a key + price exist. */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/**
 * Storefront online order payments are available. Wired to real Stripe PaymentIntents
 * in P3; false for now so the storefront defaults to pay-on-arrival.
 */
export function isOnlinePaymentConfigured(): boolean {
  return false;
}
