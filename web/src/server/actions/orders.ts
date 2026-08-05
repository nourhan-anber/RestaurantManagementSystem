'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { advanceOrderStatus, cancelOrder, settleBill } from '@/server/services/orders';
import { awardLoyaltyForOrder } from '@/server/services/loyalty';
import { isOrderStatus } from '@/lib/orders';
import { settleBillSchema } from '@/lib/validation/payment';

export async function advanceOrder(slug: string, orderId: number, status: string): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'order:advance');
  if (!isOrderStatus(status)) return;
  await advanceOrderStatus(db, restaurantId, orderId, status);
  // Reaching DELIVERED completes the order — award loyalty points (idempotent).
  if (status === 'DELIVERED') await awardLoyaltyForOrder(db, restaurantId, orderId);
  revalidatePath(`/r/${slug}/kitchen`);
  revalidatePath(`/r/${slug}/floor`);
}

/** Cancel an order with an optional reason (reads `reason` from the form if present). */
export async function cancelOrderAction(slug: string, orderId: number, formData: FormData): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'order:advance');
  const reason = (formData.get('reason') as string | null)?.trim() || undefined;
  await cancelOrder(db, restaurantId, orderId, reason);
  revalidatePath(`/r/${slug}/kitchen`);
  revalidatePath(`/r/${slug}/floor`);
  revalidatePath(`/r/${slug}/orders`);
  revalidatePath(`/r/${slug}/orders/${orderId}`);
}

export interface SettleState {
  error?: string;
  ok?: boolean;
}

export async function settleTableBill(
  slug: string,
  tableId: number,
  _prev: SettleState,
  formData: FormData,
): Promise<SettleState> {
  const { restaurantId } = await requireAbility(slug, 'table:write');

  const orderIds = formData.getAll('orderIds');
  const parsed = settleBillSchema.safeParse({
    method: formData.get('method'),
    transactionId: (formData.get('transactionId') as string)?.trim() || undefined,
    tip: formData.get('tip'),
    discount: formData.get('discount'),
    discountReason: (formData.get('discountReason') as string)?.trim() || undefined,
    orderIds: orderIds.length ? orderIds : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const result = await settleBill(db, restaurantId, tableId, parsed.data);
  revalidatePath(`/r/${slug}/floor`);
  if (!result.ok) return { error: 'This table has no open orders.' };
  // Settled orders are now DELIVERED — award loyalty points for each (idempotent).
  for (const id of result.orderIds) await awardLoyaltyForOrder(db, restaurantId, id);
  return { ok: true };
}
