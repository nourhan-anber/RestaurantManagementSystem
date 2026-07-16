import type { PrismaClient } from '@/generated/prisma/client';
import { dispatchDelivery } from './deliveries';

export type OnlinePaymentResult =
  | { ok: true; paymentId: string; duplicate: boolean }
  | { ok: false; reason: 'order_not_found' };

/**
 * Record a successful online (Stripe) payment for a storefront order and, for
 * delivery orders, dispatch the courier now that it's paid. Idempotent on the
 * Stripe PaymentIntent id so webhook redeliveries don't double-charge or
 * double-dispatch. Called from the Stripe webhook.
 */
export async function recordOnlinePayment(
  db: PrismaClient,
  input: { orderId: number; stripePaymentIntentId: string; amountCents: number; currency: string },
): Promise<OnlinePaymentResult> {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, restaurantId: true, orderType: true },
  });
  if (!order) return { ok: false, reason: 'order_not_found' };

  const existing = await db.payment.findUnique({
    where: { stripePaymentIntentId: input.stripePaymentIntentId },
  });
  if (existing) return { ok: true, paymentId: existing.id, duplicate: true };

  const payment = await db.payment.create({
    data: {
      restaurantId: order.restaurantId,
      orderId: order.id,
      method: 'ONLINE',
      status: 'SUCCEEDED',
      amount: input.amountCents / 100,
      currency: input.currency,
      stripePaymentIntentId: input.stripePaymentIntentId,
    },
  });

  if (order.orderType === 'DELIVERY') {
    await dispatchDelivery(db, order.id);
  }

  return { ok: true, paymentId: payment.id, duplicate: false };
}
