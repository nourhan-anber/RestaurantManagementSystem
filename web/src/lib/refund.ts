/** Pure refund math — validated/clamped against a payment's already-refunded balance. */

export interface RefundablePayment {
  /** The original captured amount. */
  amount: number;
  /** How much of it has already been refunded (0 for a fresh payment). */
  refundedAmount: number;
}

export type RefundPlan =
  | { ok: true; refundAmount: number; refundedTotal: number; fullyRefunded: boolean }
  | { ok: false; reason: 'nothing_left' | 'invalid_amount' | 'exceeds_remaining' };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Decide how much of `payment` may be refunded now. `requested` omitted refunds the
 * full remaining balance; otherwise it's validated against what's still refundable.
 * Reports `fullyRefunded` so the caller can flip the payment's status to REFUNDED.
 */
export function planRefund(payment: RefundablePayment, requested?: number): RefundPlan {
  const remaining = round2(payment.amount - payment.refundedAmount);
  if (remaining <= 0) return { ok: false, reason: 'nothing_left' };

  const amount = requested === undefined ? remaining : round2(requested);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'invalid_amount' };
  if (amount > remaining) return { ok: false, reason: 'exceeds_remaining' };

  const refundedTotal = round2(payment.refundedAmount + amount);
  return { ok: true, refundAmount: amount, refundedTotal, fullyRefunded: refundedTotal >= payment.amount };
}
