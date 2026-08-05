import type { PrismaClient } from '@/generated/prisma/client';
import type { OrderType } from '@/generated/prisma/enums';
import { ACTIVE_KITCHEN_STATUSES, TERMINAL_STATUSES } from '@/lib/orders';

export interface UpcomingOrder {
  id: number;
  requestedTime: Date;
  orderType: OrderType;
  name: string | null;
}

export interface DashboardStats {
  activeOrders: number; // in the kitchen right now
  eightySixCount: number; // menu items currently 86'd
  upcoming: UpcomingOrder[]; // next scheduled orders still open
}

/** Live operational counters for the tenant overview — kitchen load, 86'd items, and
 *  the next few scheduled orders that haven't been fulfilled yet. */
export async function dashboardStats(
  db: PrismaClient,
  restaurantId: number,
  now: Date,
): Promise<DashboardStats> {
  const [activeOrders, eightySixCount, upcoming] = await Promise.all([
    db.order.count({ where: { restaurantId, status: { in: [...ACTIVE_KITCHEN_STATUSES] } } }),
    db.menuItem.count({ where: { restaurantId, isAvailable: false } }),
    db.order.findMany({
      where: { restaurantId, requestedTime: { gt: now }, status: { notIn: [...TERMINAL_STATUSES] } },
      orderBy: { requestedTime: 'asc' },
      take: 5,
      select: { id: true, requestedTime: true, orderType: true, guestName: true, customerName: true },
    }),
  ]);

  return {
    activeOrders,
    eightySixCount,
    upcoming: upcoming
      .filter((o): o is typeof o & { requestedTime: Date } => o.requestedTime != null)
      .map((o) => ({
        id: o.id,
        requestedTime: o.requestedTime,
        orderType: o.orderType,
        name: o.customerName ?? o.guestName,
      })),
  };
}
