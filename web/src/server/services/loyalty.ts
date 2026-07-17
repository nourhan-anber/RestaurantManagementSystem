import type { PrismaClient } from '@/generated/prisma/client';
import { pointsEarned } from '@/lib/loyalty';

/**
 * Award loyalty points for a completed order. Idempotent per order (guarded by the
 * unique ledger.orderId) and a no-op when loyalty is off or the order has no linked
 * customer. Returns the points awarded (0 when nothing happened).
 */
export async function awardLoyaltyForOrder(
  db: PrismaClient,
  restaurantId: number,
  orderId: number,
): Promise<number> {
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId },
    select: {
      customerId: true,
      total: true,
      restaurant: { select: { loyaltyEnabled: true, pointsPerDollar: true } },
    },
  });
  if (!order?.customerId || !order.restaurant.loyaltyEnabled) return 0;

  // Already awarded for this order (webhook/settle redelivery)? Do nothing.
  if (await db.pointsLedger.findUnique({ where: { orderId } })) return 0;

  const points = pointsEarned(Number(order.total), order.restaurant.pointsPerDollar);
  if (points <= 0) return 0;

  await db.$transaction([
    db.pointsLedger.create({
      data: { restaurantId, customerId: order.customerId, orderId, delta: points, reason: 'earn' },
    }),
    db.customer.update({ where: { id: order.customerId }, data: { points: { increment: points } } }),
  ]);
  return points;
}

/** Recent points-ledger entries for a customer (for the CRM detail page). */
export function recentLedger(db: PrismaClient, customerId: number, take = 10) {
  return db.pointsLedger.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, delta: true, reason: true, createdAt: true },
  });
}
