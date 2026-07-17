import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  advanceOrderStatus,
  cancelOrder,
  listKitchenOrders,
  listOrders,
  placeOnlineOrder,
  placeOrder,
  settleBill,
} from './orders';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture() {
  const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
  const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
  const category = await db.menuCategory.create({
    data: { restaurantId: r.id, name: 'main', position: 0 },
  });
  const item = await db.menuItem.create({
    data: { restaurantId: r.id, categoryId: category.id, name: 'Dish', price: '10.00' },
  });
  return { r, table, item };
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('orders service', () => {
  it('places an order, computes the total server-side, and occupies the table', async () => {
    const { r, table, item } = await fixture();
    const res = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 3 }]);
    expect(res).toMatchObject({ ok: true, total: 30 });

    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe('OCCUPIED');

    const kds = await listKitchenOrders(db, r.id);
    expect(kds).toHaveLength(1);
    expect(kds[0].table?.number).toBe(1);
    expect(kds[0].items[0].menuItem.name).toBe('Dish');
  });

  it('rejects an unknown table or unavailable item', async () => {
    const { r, table, item } = await fixture();
    expect(await placeOrder(db, r.id, 9999, [{ menuItemId: item.id, quantity: 1 }])).toEqual({
      ok: false,
      reason: 'table',
    });
    await db.menuItem.update({ where: { id: item.id }, data: { isAvailable: false } });
    expect(await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }])).toEqual({
      ok: false,
      reason: 'items',
    });
  });

  it('advance is tenant-scoped; settling the bill records a payment and reopens the table', async () => {
    const { r, table, item } = await fixture();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]); // $10
    const placed2 = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]); // $20
    if (!placed2.ok) throw new Error('expected ok');

    // Cross-tenant advance touches zero rows.
    expect((await advanceOrderStatus(db, 9999, placed2.orderId, 'PREPARING')).count).toBe(0);
    expect((await advanceOrderStatus(db, r.id, placed2.orderId, 'PREPARING')).count).toBe(1);

    const settled = await settleBill(db, r.id, table.id, { method: 'CARD', transactionId: 'auth_9' });
    expect(settled).toMatchObject({ ok: true, amount: 30, orderCount: 2 });

    // One Payment per settled order, each linked to its order, summing to the bill.
    const payments = await db.payment.findMany({ where: { restaurantId: r.id } });
    expect(payments).toHaveLength(2);
    expect(payments.every((p) => p.method === 'CARD' && p.transactionId === 'auth_9' && p.status === 'SUCCEEDED')).toBe(true);
    expect(payments.every((p) => p.orderId != null && p.tableId === table.id)).toBe(true);
    expect(payments.reduce((sum, p) => sum + Number(p.amount), 0)).toBe(30);

    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe('OPEN');
    expect(await listKitchenOrders(db, r.id)).toHaveLength(0);

    // Re-settling an empty table records nothing.
    expect(await settleBill(db, r.id, table.id, { method: 'CASH' })).toEqual({ ok: false, reason: 'empty' });
    expect(await db.payment.count({ where: { restaurantId: r.id } })).toBe(2);
  });

  it('splits a bill-level tip across per-order payments proportional to their totals', async () => {
    const { r, table, item } = await fixture();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]); // $10
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]); // $20

    const settled = await settleBill(db, r.id, table.id, { method: 'CASH', tip: 6 });
    expect(settled).toMatchObject({ ok: true, amount: 30, tip: 6, orderCount: 2 });

    const payments = await db.payment.findMany({ where: { restaurantId: r.id }, orderBy: { amount: 'asc' } });
    expect(payments.map((p) => Number(p.tipAmount))).toEqual([2, 4]); // 1:2 split of 6
    expect(payments.map((p) => Number(p.amount))).toEqual([12, 24]); // order total + tip share
    expect(payments.reduce((s, p) => s + Number(p.tipAmount), 0)).toBe(6);

    const orders = await db.order.findMany({ where: { restaurantId: r.id }, orderBy: { total: 'asc' } });
    expect(orders.map((o) => Number(o.tipAmount))).toEqual([2, 4]);
  });

  it('settles only the selected orders, leaving the rest open (split the check)', async () => {
    const { r, table, item } = await fixture();
    const a = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]); // $10
    const b = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]); // $20
    if (!a.ok || !b.ok) throw new Error('expected ok');

    // Settle order A only.
    const first = await settleBill(db, r.id, table.id, { method: 'CASH', orderIds: [a.orderId] });
    expect(first).toMatchObject({ ok: true, amount: 10, orderCount: 1 });

    expect((await db.order.findUniqueOrThrow({ where: { id: a.orderId } })).status).toBe('DELIVERED');
    expect((await db.order.findUniqueOrThrow({ where: { id: b.orderId } })).status).not.toBe('DELIVERED');
    // The table stays occupied while order B is still open.
    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe('OCCUPIED');
    expect(await db.payment.count({ where: { restaurantId: r.id } })).toBe(1);

    // Settle the rest → table reopens.
    const second = await settleBill(db, r.id, table.id, { method: 'CARD', transactionId: 'x', orderIds: [b.orderId] });
    expect(second).toMatchObject({ ok: true, amount: 20, orderCount: 1 });
    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe('OPEN');
    expect(await db.payment.count({ where: { restaurantId: r.id } })).toBe(2);
  });

  it('settles nothing when the selection matches no open order', async () => {
    const { r, table, item } = await fixture();
    const a = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    if (!a.ok) throw new Error('expected ok');
    expect(await settleBill(db, r.id, table.id, { method: 'CASH', orderIds: [999999] })).toEqual({ ok: false, reason: 'empty' });
    expect((await db.order.findUniqueOrThrow({ where: { id: a.orderId } })).status).not.toBe('DELIVERED');
  });

  it('places tableless online orders without touching table status', async () => {
    const { r, table, item } = await fixture();
    // Occupy the dine-in table so we can prove the online order does not change it.
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    const before = (await db.table.findUniqueOrThrow({ where: { id: table.id } })).status;

    const pickup = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 1 }],
    );
    expect(pickup.ok).toBe(true);

    const delivery = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'delivery', customerName: 'Ada', customerPhone: '555-0101', deliveryAddress: '1 Main St' },
      [{ menuItemId: item.id, quantity: 2 }],
    );
    expect(delivery.ok).toBe(true);

    const online = await db.order.findMany({ where: { restaurantId: r.id, tableId: null } });
    expect(online).toHaveLength(2);
    expect(online.map((o) => o.orderType).sort()).toEqual(['DELIVERY', 'PICKUP']);
    expect(online.every((o) => o.tableId === null)).toBe(true);

    // The dine-in table's status is unchanged by the online orders.
    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe(before);
  });
});

describe('placeOrder with modifiers', () => {
  async function withModifier() {
    const r = await db.restaurant.create({ data: { name: 'M', slug: 'm' } });
    const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
    const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
    const item = await db.menuItem.create({
      data: { restaurantId: r.id, categoryId: cat.id, name: 'Burger', price: '10.00' },
    });
    const group = await db.modifierGroup.create({
      data: {
        menuItemId: item.id,
        name: 'Size',
        minSelect: 1,
        maxSelect: 1,
        position: 0,
        options: {
          create: [
            { name: 'Small', priceDelta: '0', position: 0 },
            { name: 'Large', priceDelta: '4.00', position: 1 },
          ],
        },
      },
      include: { options: { orderBy: { position: 'asc' } } },
    });
    return { r, table, item, small: group.options[0], large: group.options[1] };
  }

  it('prices the line with the option delta and stores snapshots', async () => {
    const { r, table, item, large } = await withModifier();
    const res = await placeOrder(db, r.id, table.id, [
      { menuItemId: item.id, quantity: 2, optionIds: [large.id] },
    ]);
    expect(res).toMatchObject({ ok: true, total: 28 }); // (10 + 4) x 2

    const orderItem = await db.orderItem.findFirstOrThrow({ include: { modifiers: true } });
    expect(Number(orderItem.unitPrice)).toBe(14);
    expect(orderItem.modifiers).toHaveLength(1);
    expect(orderItem.modifiers[0].optionName).toBe('Large');
  });

  it('rejects a missing required option or a foreign option id', async () => {
    const { r, table, item } = await withModifier();
    expect(await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1, optionIds: [] }])).toEqual({
      ok: false,
      reason: 'items',
    });
    expect(
      await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1, optionIds: [99999] }]),
    ).toEqual({ ok: false, reason: 'items' });
  });

  it('keeps the snapshot when the option is later deleted (optionId nulled)', async () => {
    const { r, table, item, large } = await withModifier();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1, optionIds: [large.id] }]);
    await db.modifierOption.delete({ where: { id: large.id } });

    const snap = await db.orderItemModifier.findFirstOrThrow();
    expect(snap.optionId).toBeNull();
    expect(snap.optionName).toBe('Large');
    expect(Number(snap.priceDelta)).toBe(4);
  });

  it('stores guest info and order note', async () => {
    const { r, table, item, small } = await withModifier();
    const res = await placeOrder(
      db,
      r.id,
      table.id,
      [{ menuItemId: item.id, quantity: 1, optionIds: [small.id] }],
      { guestName: 'Sam', guestEmail: 'sam@x.com', notes: 'window seat' },
    );
    if (!res.ok) throw new Error('expected ok');
    const order = await db.order.findUniqueOrThrow({ where: { id: res.orderId } });
    expect(order.guestName).toBe('Sam');
    expect(order.guestEmail).toBe('sam@x.com');
    expect(order.notes).toBe('window seat');
  });
});

describe('order tax', () => {
  async function taxedFixture(ratePercent = '13.0000') {
    const r = await db.restaurant.create({
      data: { name: 'Taxed', slug: 'taxed', taxEnabled: true, taxRatePercent: ratePercent },
    });
    const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
    const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
    const item = await db.menuItem.create({
      data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
    });
    return { r, table, item };
  }

  it('snapshots subtotal, applied rate, and add-on tax onto the order', async () => {
    const { r, table, item } = await taxedFixture();
    const res = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]);
    expect(res).toMatchObject({ ok: true, total: 22.6 });

    const order = await db.order.findFirstOrThrow({ where: { restaurantId: r.id } });
    expect(Number(order.subtotal)).toBe(20);
    expect(Number(order.taxRatePercent)).toBe(13);
    expect(Number(order.taxAmount)).toBe(2.6);
    expect(Number(order.total)).toBe(22.6);
  });

  it('leaves orders untaxed when the restaurant has tax disabled', async () => {
    const r = await db.restaurant.create({ data: { name: 'Plain', slug: 'plain' } });
    const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
    const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
    const item = await db.menuItem.create({
      data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
    });
    const res = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    if (!res.ok) throw new Error('expected ok');
    const order = await db.order.findUniqueOrThrow({ where: { id: res.orderId } });
    expect(Number(order.subtotal)).toBe(10);
    expect(Number(order.taxAmount)).toBe(0);
    expect(Number(order.total)).toBe(10);
  });

  it('settling a taxed bill records the summed tax on the payment', async () => {
    const { r, table, item } = await taxedFixture();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]); // 20 + 2.60
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]); // 10 + 1.30

    const settled = await settleBill(db, r.id, table.id, { method: 'CASH' });
    expect(settled).toMatchObject({ ok: true, amount: 33.9, orderCount: 2 });

    // Per-order payments carry that order's own amount + tax; together they sum to the bill.
    const payments = await db.payment.findMany({ where: { restaurantId: r.id } });
    expect(payments).toHaveLength(2);
    expect(payments.every((p) => p.orderId != null)).toBe(true);
    expect(payments.reduce((sum, p) => sum + Number(p.amount), 0)).toBeCloseTo(33.9, 2);
    expect(payments.reduce((sum, p) => sum + Number(p.taxAmount), 0)).toBeCloseTo(3.9, 2);
  });

  it('applies a settle-time comp across orders, re-taxing each on the discounted base', async () => {
    const { r, table, item } = await taxedFixture();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]); // subtotal 20
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]); // subtotal 10

    // $9 comp split 20:10 → 6 / 3. Bases 14 / 7; 13% tax 1.82 / 0.91; totals 15.82 / 7.91.
    const settled = await settleBill(db, r.id, table.id, { method: 'CASH', discount: 9, discountReason: 'VIP' });
    expect(settled).toMatchObject({ ok: true, discount: 9, orderCount: 2 });
    expect(settled.ok && settled.amount).toBeCloseTo(23.73, 2); // post-discount, pre-tip bill

    const orders = await db.order.findMany({ where: { restaurantId: r.id }, orderBy: { subtotal: 'asc' } });
    expect(orders.map((o) => Number(o.discountAmount))).toEqual([3, 6]);
    expect(orders.map((o) => Number(o.taxAmount))).toEqual([0.91, 1.82]);
    expect(orders.map((o) => Number(o.total))).toEqual([7.91, 15.82]);
    expect(orders.every((o) => o.discountReason === 'VIP')).toBe(true);

    const payments = await db.payment.findMany({ where: { restaurantId: r.id } });
    expect(payments.reduce((s, p) => s + Number(p.amount), 0)).toBeCloseTo(23.73, 2);
  });
});

describe('cancelOrder', () => {
  it('cancels an open order, reopens the table, and drops it off the KDS', async () => {
    const { r, table, item } = await fixture();
    const placed = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    if (!placed.ok) throw new Error('expected ok');
    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe('OCCUPIED');

    expect(await cancelOrder(db, r.id, placed.orderId, '  86 the dish  ')).toEqual({ ok: true });

    const order = await db.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(order.status).toBe('CANCELLED');
    expect(order.cancelReason).toBe('86 the dish');
    // Trigger reopens the table once no active orders remain.
    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe('OPEN');
    expect(await listKitchenOrders(db, r.id)).toHaveLength(0);
  });

  it('is tenant-scoped and refuses to cancel a terminal order', async () => {
    const { r, table, item } = await fixture();
    const placed = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    if (!placed.ok) throw new Error('expected ok');

    expect(await cancelOrder(db, 9999, placed.orderId)).toEqual({ ok: false, reason: 'not_found' });

    expect(await cancelOrder(db, r.id, placed.orderId)).toEqual({ ok: true });
    // Second cancel hits an already-terminal order.
    expect(await cancelOrder(db, r.id, placed.orderId)).toEqual({ ok: false, reason: 'already_terminal' });
  });
});

describe('listOrders', () => {
  it('lists newest-first, filters by customer and date, and paginates', async () => {
    const { r, table, item } = await fixture();
    // Two dine-in orders, plus one online (has a customer).
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]);
    const online = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Ada', customerPhone: '416-555-0111' },
      [{ menuItemId: item.id, quantity: 1 }],
    );
    if (!online.ok) throw new Error('expected ok');
    const customer = await db.order.findUniqueOrThrow({ where: { id: online.orderId } });

    const all = await listOrders(db, r.id, {});
    expect(all.total).toBe(3);
    expect(all.rows[0].id).toBeGreaterThan(all.rows[1].id); // newest first
    expect(all.rows[0].customerName).toBe('Ada');
    expect(all.rows[0].itemCount).toBe(1);

    // Filter by customer.
    const forCustomer = await listOrders(db, r.id, { customerId: customer.customerId! });
    expect(forCustomer.total).toBe(1);
    expect(forCustomer.rows[0].id).toBe(online.orderId);

    // Pagination.
    const page1 = await listOrders(db, r.id, { skip: 0, take: 2 });
    expect(page1.total).toBe(3);
    expect(page1.rows).toHaveLength(2);

    // Date filter that excludes everything (future window).
    const future = await listOrders(db, r.id, { from: new Date('2099-01-01T00:00:00Z') });
    expect(future.total).toBe(0);
  });
});
