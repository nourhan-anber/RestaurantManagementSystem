'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { refundPayment } from '@/server/services/payments';
import { refundSchema } from '@/lib/validation/payment';

export interface RefundState {
  error?: string;
  ok?: boolean;
}

/**
 * Refund a payment from the order-detail page (gated on `payment:refund`). A blank
 * amount refunds the full remaining balance. `orderId` is used only to revalidate
 * the detail view after the refund lands.
 */
export async function refundPaymentAction(
  slug: string,
  paymentId: string,
  orderId: number,
  _prev: RefundState,
  formData: FormData,
): Promise<RefundState> {
  const { restaurantId } = await requireAbility(slug, 'payment:refund');

  const parsed = refundSchema.safeParse({
    amount: formData.get('amount'),
    reason: (formData.get('reason') as string | null)?.trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const result = await refundPayment(db, restaurantId, paymentId, parsed.data);
  if (!result.ok) {
    const message: Record<typeof result.reason, string> = {
      not_found: 'Payment not found.',
      nothing_left: 'This payment is already fully refunded.',
      invalid_amount: 'Enter a valid refund amount.',
      exceeds_remaining: 'Amount exceeds the refundable balance.',
    };
    return { error: message[result.reason] };
  }

  revalidatePath(`/r/${slug}/orders/${orderId}`);
  revalidatePath(`/r/${slug}/reports`);
  return { ok: true };
}
