import type { PrismaClient } from '@/generated/prisma/client';
import type { OrderStatus, OrderType } from '@/generated/prisma/enums';
import { ACTIVE_KITCHEN_STATUSES, TERMINAL_STATUSES } from '@/lib/orders';
import { priceLine, type ItemSpec } from '@/lib/modifiers';
import { computeTax } from '@/lib/tax';
import { allocateTip } from '@/lib/tip';
import { upsertCustomerForOrder } from '@/server/services/customers';
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

/** Full order for the single-order detail view (items + modifiers, payments, delivery). */
export function getOrderDetail(db: PrismaClient, restaurantId: number, orderId: number) {
  return db.order.findFirst({
    where: { id: orderId, restaurantId },
    include: {
      items: {
        orderBy: { id: 'asc' },
        include: { menuItem: { select: { name: true } }, modifiers: { orderBy: { id: 'asc' } } },
      },
      table: { select: { number: true } },
      customer: { select: { id: true, name: true, phone: true, email: true } },
      payments: { orderBy: { createdAt: 'asc' } },
      delivery: true,
    },
  });
}

export interface OrderListItem {
  id: number;
  createdAt: Date;
  requestedTime: Date | null;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  total: number;
  customerName: string | null;
  tableNumber: number | null;
  itemCount: number;
}

export interface ListOrdersOptions {
  customerId?: number;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
}

/**
 * Tenant-scoped order history, newest first — for the restaurant orders page and a
 * customer's order history. Optionally filtered by customer and a createdAt range,
 * and paginated. Returns the page rows plus the total matching count.
 */
export async function listOrders(
  db: PrismaClient,
  restaurantId: number,
  opts: ListOrdersOptions = {},
): Promise<{ rows: OrderListItem[]; total: number }> {
  const where = {
    restaurantId,
    ...(opts.customerId ? { customerId: opts.customerId } : {}),
    ...(opts.from || opts.to
      ? { createdAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
      : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: opts.skip,
      take: opts.take,
      include: {
        table: { select: { number: true } },
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  const rows: OrderListItem[] = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    requestedTime: o.requestedTime,
    orderType: o.orderType,
    status: o.status,
    subtotal: Number(o.subtotal),
    taxAmount: Number(o.taxAmount),
    total: Number(o.total),
    customerName: o.customerName ?? o.guestName,
    tableNumber: o.table?.number ?? null,
    itemCount: o._count.items,
  }));
  return { rows, total };
}

export type SettleResult =
  | { ok: true; amount: number; tip: number; orderCount: number }
  | { ok: false; reason: 'empty' };

/**
 * Settle a table's bill in one transaction: mark its active orders delivered
 * (the trigger reopens the table) and record **one Payment per order** so each
 * order links to its payment (the order-detail page reads `order.payments`). A
 * bill-level `tip` is split across the orders proportional to their totals; each
 * Payment's `amount` is the order total plus its tip share (what was collected).
 * Re-settling an already-empty table records nothing. `amount` is the pre-tip bill.
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
      select: { id: true, total: true, taxAmount: true },
    });
    if (active.length === 0) return { ok: false, reason: 'empty' };
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const amount = round2(active.reduce((sum, o) => sum + Number(o.total), 0));
    const tip = round2(input.tip ?? 0);
    const tipParts = allocateTip(active.map((o) => Number(o.total)), tip);

    await Promise.all(
      active.map((o, i) =>
        tx.order.update({ where: { id: o.id }, data: { status: 'DELIVERED', tipAmount: tipParts[i] } }),
      ),
    );
    await tx.payment.createMany({
      data: active.map((o, i) => ({
        restaurantId,
        tableId,
        orderId: o.id,
        amount: round2(Number(o.total) + tipParts[i]),
        taxAmount: o.taxAmount,
        tipAmount: tipParts[i],
        currency: 'usd',
        method: input.method,
        transactionId: input.transactionId ?? null,
        status: 'SUCCEEDED' as const,
      })),
    });
    return { ok: true, amount, tip, orderCount: active.length };
  });
}

export type CancelResult = { ok: true } | { ok: false; reason: 'not_found' | 'already_terminal' };

/** Cancel an active order → CANCELLED (the DB trigger reopens its table). Tenant-scoped. */
export async function cancelOrder(
  db: PrismaClient,
  restaurantId: number,
  orderId: number,
  reason?: string,
): Promise<CancelResult> {
  const order = await db.order.findFirst({ where: { id: orderId, restaurantId }, select: { status: true } });
  if (!order) return { ok: false, reason: 'not_found' };
  if (TERMINAL_STATUSES.includes(order.status)) return { ok: false, reason: 'already_terminal' };
  await db.order.update({
    where: { id: orderId },
    data: { status: 'CANCELLED', cancelReason: reason?.trim() || null },
  });
  return { ok: true };
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
  /** Optional gratuity (storefront checkout). Stored on `tipAmount`; `total` stays food+tax. */
  tip?: number;
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
  | { ok: true; orderId: number; subtotal: number; taxAmount: number; total: number }
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

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.item.quantity, 0);

  // Server-authoritative sales tax (add-on): read the restaurant's config and
  // snapshot the applied rate + amount onto the order so history stays correct.
  const taxConfig = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { taxEnabled: true, taxRatePercent: true },
  });
  const ratePercent = Number(taxConfig?.taxRatePercent ?? 0);
  const enabled = taxConfig?.taxEnabled ?? false;
  const tax = computeTax(subtotal, ratePercent, enabled);
  const appliedRate = tax.taxAmount > 0 ? ratePercent : 0;

  const online = fulfillment.kind !== 'dine_in';
  // Identify the customer (CRM): dine-in may carry a guest email; online carries a
  // name + phone. Deduped/linked inside the same transaction as the order.
  const contact =
    fulfillment.kind === 'dine_in'
      ? { name: guest.guestName ?? null, phone: null, email: guest.guestEmail ?? null }
      : { name: fulfillment.customerName, phone: fulfillment.customerPhone, email: guest.guestEmail ?? null };

  const order = await db.$transaction(async (tx) => {
    const customerId = await upsertCustomerForOrder(tx, restaurantId, contact);
    const created = await tx.order.create({
      data: {
        restaurantId,
        customerId,
        tableId: fulfillment.kind === 'dine_in' ? fulfillment.tableId : null,
        orderType:
          fulfillment.kind === 'dine_in'
            ? 'DINE_IN'
            : fulfillment.kind === 'pickup'
              ? 'PICKUP'
              : 'DELIVERY',
        subtotal: tax.subtotal,
        taxRatePercent: appliedRate,
        taxAmount: tax.taxAmount,
        tipAmount: Math.max(0, Math.round((guest.tip ?? 0) * 100) / 100),
        total: tax.total,
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

  return {
    ok: true,
    orderId: order.id,
    subtotal: tax.subtotal,
    taxAmount: tax.taxAmount,
    total: tax.total,
  };
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
