import type { PrismaClient } from '@/generated/prisma/client';
import { dispatchDelivery } from './deliveries';
import { gatewayRefund } from '@/server/refunds';
import { planRefund } from '@/lib/refund';

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
    select: { id: true, restaurantId: true, orderType: true, taxAmount: true, tipAmount: true },
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
      taxAmount: order.taxAmount,
      tipAmount: order.tipAmount,
      currency: input.currency,
      stripePaymentIntentId: input.stripePaymentIntentId,
    },
  });

  if (order.orderType === 'DELIVERY') {
    await dispatchDelivery(db, order.id);
  }

  return { ok: true, paymentId: payment.id, duplicate: false };
}

export type RefundResult =
  | { ok: true; refundAmount: number; refundedTotal: number; fullyRefunded: boolean; mode: 'stripe' | 'manual' }
  | { ok: false; reason: 'not_found' | 'nothing_left' | 'invalid_amount' | 'exceeds_remaining' };

/**
 * Refund a payment (fully when `amount` is omitted, otherwise the partial amount),
 * tenant-scoped. Routes through Stripe when configured + a PaymentIntent is present,
 * else records a manual/cash void. Accumulates `refundedAmount`; flips status to
 * REFUNDED once fully refunded. `reason` is stored for the audit trail.
 */
export async function refundPayment(
  db: PrismaClient,
  restaurantId: number,
  paymentId: string,
  input: { amount?: number; reason?: string } = {},
): Promise<RefundResult> {
  const payment = await db.payment.findFirst({
    where: { id: paymentId, restaurantId },
    select: { id: true, amount: true, refundedAmount: true, stripePaymentIntentId: true },
  });
  if (!payment) return { ok: false, reason: 'not_found' };

  const plan = planRefund(
    { amount: Number(payment.amount), refundedAmount: Number(payment.refundedAmount) },
    input.amount,
  );
  if (!plan.ok) return plan;

  const { mode } = await gatewayRefund({
    stripePaymentIntentId: payment.stripePaymentIntentId,
    amount: plan.refundAmount,
  });

  await db.payment.update({
    where: { id: payment.id },
    data: {
      refundedAmount: plan.refundedTotal,
      refundReason: input.reason?.trim() || null,
      refundedAt: new Date(),
      ...(plan.fullyRefunded ? { status: 'REFUNDED' as const } : {}),
    },
  });

  return {
    ok: true,
    refundAmount: plan.refundAmount,
    refundedTotal: plan.refundedTotal,
    fullyRefunded: plan.fullyRefunded,
    mode,
  };
}
