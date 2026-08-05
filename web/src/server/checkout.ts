import { getStripe } from './stripe';
import { requestBaseUrl } from './base-url';
import { orderCheckoutLineItems } from '@/lib/checkout';

export interface OrderCheckoutInput {
  slug: string;
  orderId: number;
  restaurantId: number;
  restaurantName: string;
  subtotalCents: number;
  taxCents?: number;
  taxLabel?: string;
  tipCents?: number;
  deliveryFeeCents?: number;
  currency?: string;
}

/**
 * Create a Stripe Checkout Session (mode: payment) for a placed storefront order.
 * The line items (subtotal + tax/delivery/tip) are assembled by the unit-tested
 * `orderCheckoutLineItems`; the orderId travels in metadata so the webhook can
 * record the payment and dispatch. Returns the hosted URL, or null when Stripe
 * isn't configured.
 */
export async function createOrderCheckout(input: OrderCheckoutInput): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const base = await requestBaseUrl();
  const lineItems = orderCheckoutLineItems({
    restaurantName: input.restaurantName,
    orderId: input.orderId,
    currency: input.currency ?? 'usd',
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    taxLabel: input.taxLabel,
    deliveryFeeCents: input.deliveryFeeCents,
    tipCents: input.tipCents,
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${base}/order/${input.slug}?paid=1`,
    cancel_url: `${base}/order/${input.slug}?canceled=1`,
    client_reference_id: String(input.orderId),
    metadata: { kind: 'order', orderId: String(input.orderId), restaurantId: String(input.restaurantId) },
    payment_intent_data: {
      metadata: { kind: 'order', orderId: String(input.orderId) },
    },
  });

  return session.url ? { url: session.url } : null;
}
