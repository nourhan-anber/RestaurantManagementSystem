import type { PrismaClient } from '@/generated/prisma/client';
import type { OrderStatus } from '@/generated/prisma/enums';
import { ACTIVE_KITCHEN_STATUSES, TERMINAL_STATUSES } from '@/lib/orders';

export function listKitchenOrders(db: PrismaClient, restaurantId: number) {
  return db.order.findMany({
    where: { restaurantId, status: { in: [...ACTIVE_KITCHEN_STATUSES] } },
    orderBy: { createdAt: 'asc' },
    include: {
      table: { select: { number: true } },
      items: { include: { menuItem: { select: { name: true } } }, orderBy: { id: 'asc' } },
    },
  });
}

/** Tenant-scoped status change; the DB trigger reopens the table on terminal states. */
export function advanceOrderStatus(
  db: PrismaClient,
  restaurantId: number,
  orderId: number,
  status: OrderStatus,
) {
  return db.order.updateMany({ where: { id: orderId, restaurantId }, data: { status } });
}

export function listFloor(db: PrismaClient, restaurantId: number) {
  return db.table.findMany({
    where: { restaurantId, isActive: true },
    orderBy: { number: 'asc' },
    include: {
      orders: {
        where: { status: { notIn: [...TERMINAL_STATUSES] } },
        orderBy: { createdAt: 'asc' },
        include: { items: { include: { menuItem: { select: { name: true } } } } },
      },
    },
  });
}

/** Settle a table: mark its active orders delivered (trigger reopens the table). */
export function closeBill(db: PrismaClient, restaurantId: number, tableId: number) {
  return db.order.updateMany({
    where: { restaurantId, tableId, status: { notIn: [...TERMINAL_STATUSES] } },
    data: { status: 'DELIVERED' },
  });
}

export interface PlaceOrderItem {
  menuItemId: number;
  quantity: number;
  notes?: string;
}

export type PlaceOrderResult =
  | { ok: true; orderId: number; total: number }
  | { ok: false; reason: 'table' | 'items' };

/**
 * Create an order for a table. Prices and the total are computed server-side
 * from the DB (never trusted from the client). Everything is tenant-scoped.
 */
export async function placeOrder(
  db: PrismaClient,
  restaurantId: number,
  tableId: number,
  items: PlaceOrderItem[],
  notes?: string,
): Promise<PlaceOrderResult> {
  const table = await db.table.findFirst({ where: { id: tableId, restaurantId, isActive: true } });
  if (!table) return { ok: false, reason: 'table' };

  const ids = items.map((i) => i.menuItemId);
  const menu = await db.menuItem.findMany({
    where: { id: { in: ids }, restaurantId, isAvailable: true },
    select: { id: true, price: true },
  });
  if (menu.length !== new Set(ids).size) return { ok: false, reason: 'items' };

  const priceById = new Map(menu.map((m) => [m.id, Number(m.price)]));
  const total = items.reduce((sum, it) => sum + (priceById.get(it.menuItemId) ?? 0) * it.quantity, 0);

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({ data: { restaurantId, tableId, total, notes: notes ?? null } });
    await tx.orderItem.createMany({
      data: items.map((it) => ({
        orderId: created.id,
        menuItemId: it.menuItemId,
        quantity: it.quantity,
        unitPrice: priceById.get(it.menuItemId)!,
        notes: it.notes ?? null,
      })),
    });
    return created;
  });

  return { ok: true, orderId: order.id, total };
}
