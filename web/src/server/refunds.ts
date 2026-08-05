import { getStripe } from './stripe';
import { toCents } from '@/lib/format';

export interface GatewayRefundResult {
  /** Stripe refund id when routed through Stripe; null for a manual/cash void. */
  gatewayRefundId: string | null;
  mode: 'stripe' | 'manual';
}

/**
 * Push a refund to the payment gateway. When Stripe is configured AND the payment
 * carries a PaymentIntent id, refund through Stripe for the requested amount;
 * otherwise it's a manual/cash void recorded locally only (mode: 'manual'). The
 * unconfigured path never touches the network, so dev/tests stay green.
 */
export async function gatewayRefund(input: {
  stripePaymentIntentId: string | null;
  amount: number;
}): Promise<GatewayRefundResult> {
  const stripe = getStripe();
  if (stripe && input.stripePaymentIntentId) {
    const refund = await stripe.refunds.create({
      payment_intent: input.stripePaymentIntentId,
      amount: toCents(input.amount),
    });
    return { gatewayRefundId: refund.id, mode: 'stripe' };
  }
  return { gatewayRefundId: null, mode: 'manual' };
}
