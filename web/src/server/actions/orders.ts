'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { advanceOrderStatus, closeBill } from '@/server/services/orders';
import { isOrderStatus } from '@/lib/orders';

export async function advanceOrder(slug: string, orderId: number, status: string): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'order:advance');
  if (!isOrderStatus(status)) return;
  await advanceOrderStatus(db, restaurantId, orderId, status);
  revalidatePath(`/r/${slug}/kitchen`);
  revalidatePath(`/r/${slug}/floor`);
}

export async function closeTableBill(slug: string, tableId: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'table:write');
  await closeBill(db, restaurantId, tableId);
  revalidatePath(`/r/${slug}/floor`);
}
