import { getStripe } from './stripe';

export interface OrderCheckoutInput {
  slug: string;
  orderId: number;
  restaurantId: number;
  restaurantName: string;
  subtotalCents: number;
  deliveryFeeCents?: number;
  currency?: string;
}

/**
 * Create a Stripe Checkout Session (mode: payment) for a placed storefront order.
 * Charges the food subtotal plus any courier fee as separate line items; the
 * orderId travels in metadata so the webhook can record the payment and dispatch.
 * Returns the hosted checkout URL, or null when Stripe isn't configured.
 */
export async function createOrderCheckout(input: OrderCheckoutInput): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const base = process.env.AUTH_URL ?? '';
  const currency = input.currency ?? 'usd';
  const lineItems: Array<{
    price_data: { currency: string; product_data: { name: string }; unit_amount: number };
    quantity: number;
  }> = [
    {
      price_data: {
        currency,
        product_data: { name: `${input.restaurantName} order #${input.orderId}` },
        unit_amount: input.subtotalCents,
      },
      quantity: 1,
    },
  ];
  if (input.deliveryFeeCents && input.deliveryFeeCents > 0) {
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: 'Delivery' },
        unit_amount: input.deliveryFeeCents,
      },
      quantity: 1,
    });
  }

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
