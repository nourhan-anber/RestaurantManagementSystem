import type { PrismaClient } from '@/generated/prisma/client';
import { safeAverage } from '@/lib/reports';

export interface SalesSummary {
  revenue: number; // net of tax
  taxCollected: number;
  orders: number;
  avgOrder: number;
  itemsSold: number;
}

/** Revenue/tax/orders/items from settled (delivered) orders, scoped to the tenant. */
export async function salesSummary(db: PrismaClient, restaurantId: number): Promise<SalesSummary> {
  const [orderAgg, itemAgg] = await Promise.all([
    db.order.aggregate({
      where: { restaurantId, status: 'DELIVERED' },
      _sum: { subtotal: true, taxAmount: true },
      _count: { _all: true },
    }),
    db.orderItem.aggregate({
      where: { order: { restaurantId, status: 'DELIVERED' } },
      _sum: { quantity: true },
    }),
  ]);

  const revenue = Number(orderAgg._sum.subtotal ?? 0);
  const taxCollected = Number(orderAgg._sum.taxAmount ?? 0);
  const orders = orderAgg._count._all;
  return {
    revenue,
    taxCollected,
    orders,
    avgOrder: safeAverage(revenue, orders),
    itemsSold: itemAgg._sum.quantity ?? 0,
  };
}

export interface TopItem {
  name: string;
  quantity: number;
}

/** Best-selling menu items by quantity across settled orders. */
export async function topItems(
  db: PrismaClient,
  restaurantId: number,
  limit = 5,
): Promise<TopItem[]> {
  const grouped = await db.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: { restaurantId, status: 'DELIVERED' } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const names = await db.menuItem.findMany({
    where: { id: { in: grouped.map((g) => g.menuItemId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(names.map((n) => [n.id, n.name]));

  return grouped.map((g) => ({
    name: nameById.get(g.menuItemId) ?? 'Unknown',
    quantity: g._sum.quantity ?? 0,
  }));
}
