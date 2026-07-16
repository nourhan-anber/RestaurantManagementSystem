import type { PrismaClient } from '@/generated/prisma/client';
import type { OrderStatus } from '@/generated/prisma/enums';
import { ACTIVE_KITCHEN_STATUSES, TERMINAL_STATUSES } from '@/lib/orders';
import { priceLine, type ItemSpec } from '@/lib/modifiers';

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
  optionIds?: number[];
}

export interface PlaceOrderGuest {
  notes?: string;
  guestName?: string;
  guestEmail?: string;
}

export type PlaceOrderResult =
  | { ok: true; orderId: number; total: number }
  | { ok: false; reason: 'table' | 'items' };

/**
 * Create an order for a table. Base prices, option deltas, and the total are all
 * computed server-side from the DB (the client only sends option ids). Each line's
 * chosen options are validated against the item's groups (required/min/max/
 * availability) and stored as immutable snapshots. Everything is tenant-scoped.
 */
export async function placeOrder(
  db: PrismaClient,
  restaurantId: number,
  tableId: number,
  items: PlaceOrderItem[],
  guest: PlaceOrderGuest = {},
): Promise<PlaceOrderResult> {
  const table = await db.table.findFirst({ where: { id: tableId, restaurantId, isActive: true } });
  if (!table) return { ok: false, reason: 'table' };

  const ids = items.map((i) => i.menuItemId);
  const menu = await db.menuItem.findMany({
    where: { id: { in: ids }, restaurantId, isAvailable: true },
    select: {
      id: true,
      price: true,
      modifierGroups: {
        select: {
          id: true,
          name: true,
          minSelect: true,
          maxSelect: true,
          options: { select: { id: true, name: true, priceDelta: true, isAvailable: true } },
        },
      },
    },
  });
  if (menu.length !== new Set(ids).size) return { ok: false, reason: 'items' };

  const specById = new Map<number, ItemSpec>(
    menu.map((m) => [
      m.id,
      {
        id: m.id,
        basePrice: Number(m.price),
        groups: m.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            priceDelta: Number(o.priceDelta),
            isAvailable: o.isAvailable,
          })),
        })),
      },
    ]),
  );

  // Price + validate every line before writing anything.
  const lines: Array<{
    item: PlaceOrderItem;
    unitPrice: number;
    snapshots: { optionId: number; groupName: string; optionName: string; priceDelta: number }[];
  }> = [];
  for (const it of items) {
    const spec = specById.get(it.menuItemId);
    if (!spec) return { ok: false, reason: 'items' };
    const result = priceLine(spec, it.optionIds ?? []);
    if (!result.ok) return { ok: false, reason: 'items' };
    lines.push({ item: it, unitPrice: result.line.unitPrice, snapshots: result.line.snapshots });
  }

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.item.quantity, 0);

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        restaurantId,
        tableId,
        total,
        notes: guest.notes ?? null,
        guestName: guest.guestName ?? null,
        guestEmail: guest.guestEmail ?? null,
      },
    });
    for (const l of lines) {
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          menuItemId: l.item.menuItemId,
          quantity: l.item.quantity,
          unitPrice: l.unitPrice,
          notes: l.item.notes ?? null,
          modifiers: { create: l.snapshots },
        },
      });
    }
    return created;
  });

  return { ok: true, orderId: order.id, total };
}
