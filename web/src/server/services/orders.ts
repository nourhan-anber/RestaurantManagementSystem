import type { PrismaClient } from '@/generated/prisma/client';
import type { OrderStatus } from '@/generated/prisma/enums';
import { ACTIVE_KITCHEN_STATUSES, TERMINAL_STATUSES } from '@/lib/orders';
import { priceLine, type ItemSpec } from '@/lib/modifiers';
import type { SettleBillInput } from '@/lib/validation/payment';

export function listKitchenOrders(db: PrismaClient, restaurantId: number) {
  return db.order.findMany({
    where: { restaurantId, status: { in: [...ACTIVE_KITCHEN_STATUSES] } },
    orderBy: { createdAt: 'asc' },
    include: {
      table: { select: { number: true } },
      items: {
        orderBy: { id: 'asc' },
        include: {
          menuItem: { select: { name: true } },
          modifiers: { select: { optionName: true }, orderBy: { id: 'asc' } },
        },
      },
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

export type SettleResult =
  | { ok: true; paymentId: string; amount: number }
  | { ok: false; reason: 'empty' };

/**
 * Settle a table's bill in one transaction: mark its active orders delivered
 * (the trigger reopens the table) and record a Payment (method + optional
 * transaction id, amount = sum of the settled orders' totals). Re-settling an
 * already-empty table records nothing.
 */
export async function settleBill(
  db: PrismaClient,
  restaurantId: number,
  tableId: number,
  input: SettleBillInput,
): Promise<SettleResult> {
  return db.$transaction(async (tx) => {
    const active = await tx.order.findMany({
      where: { restaurantId, tableId, status: { notIn: [...TERMINAL_STATUSES] } },
      select: { total: true },
    });
    if (active.length === 0) return { ok: false, reason: 'empty' };
    const amount = active.reduce((sum, o) => sum + Number(o.total), 0);

    await tx.order.updateMany({
      where: { restaurantId, tableId, status: { notIn: [...TERMINAL_STATUSES] } },
      data: { status: 'DELIVERED' },
    });
    const payment = await tx.payment.create({
      data: {
        restaurantId,
        tableId,
        amount,
        currency: 'usd',
        method: input.method,
        transactionId: input.transactionId ?? null,
        status: 'SUCCEEDED',
      },
    });
    return { ok: true, paymentId: payment.id, amount };
  });
}

// ─────────────────────── Order placement ───────────────────────

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

/** How an order is fulfilled — dine-in binds a table; online (pickup/delivery) doesn't. */
export type Fulfillment =
  | { kind: 'dine_in'; tableId: number }
  | { kind: 'pickup'; customerName: string; customerPhone: string; requestedTime?: Date }
  | {
      kind: 'delivery';
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      deliveryNotes?: string;
      requestedTime?: Date;
    };

export type PlaceOrderResult =
  | { ok: true; orderId: number; total: number }
  | { ok: false; reason: 'table' | 'items' | 'fulfillment' };

/**
 * Shared order writer for dine-in and online. Base prices, option deltas, and the
 * total are computed server-side from the DB (the client only sends option ids);
 * options are validated against each item's groups and stored as immutable
 * snapshots. Dine-in binds a table (INSERT trigger occupies it); online passes a
 * null tableId (trigger no-op, enforced by DB CHECKs). Everything is tenant-scoped.
 */
async function placeOrderCore(
  db: PrismaClient,
  restaurantId: number,
  fulfillment: Fulfillment,
  items: PlaceOrderItem[],
  guest: PlaceOrderGuest = {},
): Promise<PlaceOrderResult> {
  if (fulfillment.kind === 'dine_in') {
    const table = await db.table.findFirst({
      where: { id: fulfillment.tableId, restaurantId, isActive: true },
    });
    if (!table) return { ok: false, reason: 'table' };
  } else if (fulfillment.kind === 'delivery' && !fulfillment.deliveryAddress) {
    return { ok: false, reason: 'fulfillment' };
  }

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

  const online = fulfillment.kind !== 'dine_in';
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        restaurantId,
        tableId: fulfillment.kind === 'dine_in' ? fulfillment.tableId : null,
        orderType:
          fulfillment.kind === 'dine_in'
            ? 'DINE_IN'
            : fulfillment.kind === 'pickup'
              ? 'PICKUP'
              : 'DELIVERY',
        total,
        notes: guest.notes ?? null,
        guestName: guest.guestName ?? (online ? fulfillment.customerName : null),
        guestEmail: guest.guestEmail ?? null,
        customerName: online ? fulfillment.customerName : null,
        customerPhone: online ? fulfillment.customerPhone : null,
        deliveryAddress: fulfillment.kind === 'delivery' ? fulfillment.deliveryAddress : null,
        deliveryNotes: fulfillment.kind === 'delivery' ? (fulfillment.deliveryNotes ?? null) : null,
        requestedTime: online ? (fulfillment.requestedTime ?? null) : null,
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

/** Dine-in order placement (unchanged contract): the current /api/orders route + tests use this. */
export function placeOrder(
  db: PrismaClient,
  restaurantId: number,
  tableId: number,
  items: PlaceOrderItem[],
  guest: PlaceOrderGuest = {},
): Promise<PlaceOrderResult> {
  return placeOrderCore(db, restaurantId, { kind: 'dine_in', tableId }, items, guest);
}

/** Online (pickup/delivery) order placement — no table. Used by the storefront. */
export function placeOnlineOrder(
  db: PrismaClient,
  restaurantId: number,
  fulfillment: Extract<Fulfillment, { kind: 'pickup' | 'delivery' }>,
  items: PlaceOrderItem[],
  guest: PlaceOrderGuest = {},
): Promise<PlaceOrderResult> {
  return placeOrderCore(db, restaurantId, fulfillment, items, guest);
}
