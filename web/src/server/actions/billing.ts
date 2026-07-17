'use server';

import { redirect } from 'next/navigation';
import { requireAbility } from '@/server/tenant';
import { getStripe } from '@/server/stripe';
import { requestBaseUrl } from '@/server/base-url';

export interface CheckoutState {
  error?: string;
}

export async function startCheckout(
  slug: string,
  _prev: CheckoutState,
  _formData: FormData,
): Promise<CheckoutState> {
  const ctx = await requireAbility(slug, 'settings:write');

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID;
  const base = await requestBaseUrl();

  if (!stripe || !priceId) {
    return {
      error: 'Billing is not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable checkout.',
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/r/${slug}/settings?checkout=success`,
    cancel_url: `${base}/r/${slug}/settings?checkout=cancel`,
    client_reference_id: String(ctx.restaurantId),
    subscription_data: { metadata: { restaurantId: String(ctx.restaurantId) } },
  });

  if (!session.url) return { error: 'Could not start checkout. Please try again.' };
  redirect(session.url);
}
