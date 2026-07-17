import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder, placeOrder } from './orders';
import { refundPayment } from './payments';
import {
  customerExportRows,
  discountsTotal,
  refundsTotal,
  revenueRows,
  salesByPaymentMethod,
  salesByType,
  salesSummary,
  tipsTotal,
  topCustomers,
  topItems,
  topItemsAndCategories,
} from './reports';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE reservations, waitlist_entries, customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, points_ledger, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('reports', () => {
  it('summarizes only delivered orders and ranks top items', async () => {
    const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
    const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
    const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
    const burger = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'Burger', price: '10.00' } });
    const fries = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'Fries', price: '5.00' } });

    // Delivered order: 2 burgers + 3 fries = 20 + 15 = 35
    const o1 = await placeOrder(db, r.id, table.id, [
      { menuItemId: burger.id, quantity: 2 },
      { menuItemId: fries.id, quantity: 3 },
    ]);
    if (!o1.ok) throw new Error('expected ok');
    await db.order.update({ where: { id: o1.orderId }, data: { status: 'DELIVERED' } });

    // A still-open order should NOT count.
    await placeOrder(db, r.id, table.id, [{ menuItemId: burger.id, quantity: 5 }]);

    const summary = await salesSummary(db, r.id);
    expect(summary.revenue).toBe(35);
    expect(summary.taxCollected).toBe(0);
    expect(summary.orders).toBe(1);
    expect(summary.itemsSold).toBe(5);
    expect(summary.avgOrder).toBe(35);

    const top = await topItems(db, r.id);
    expect(top).toEqual([
      { name: 'Fries', quantity: 3 },
      { name: 'Burger', quantity: 2 },
    ]);
  });

  it('returns zeros with no delivered orders', async () => {
    const r = await db.restaurant.create({ data: { name: 'Empty', slug: 'empty' } });
    expect(await salesSummary(db, r.id)).toEqual({
      revenue: 0,
      taxCollected: 0,
      orders: 0,
      avgOrder: 0,
      itemsSold: 0,
    });
    expect(await topItems(db, r.id)).toEqual([]);
  });

  it('reports net revenue and tax collected separately when tax is enabled', async () => {
    const r = await db.restaurant.create({
      data: { name: 'Taxed', slug: 'taxed', taxEnabled: true, taxRatePercent: '13.0000' },
    });
    const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
    const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
    const item = await db.menuItem.create({
      data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
    });

    // Subtotal 20.00, HST 13% = 2.60, total 22.60.
    const o = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 2 }]);
    if (!o.ok) throw new Error('expected ok');
    await db.order.update({ where: { id: o.orderId }, data: { status: 'DELIVERED' } });

    const summary = await salesSummary(db, r.id);
    expect(summary.revenue).toBe(20); // net, excludes tax
    expect(summary.taxCollected).toBe(2.6);
    expect(summary.avgOrder).toBe(20);
  });
});

describe('reports breakdowns + range', () => {
  async function scenario() {
    const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
    const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
    const mains = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'Mains', position: 0 } });
    const sides = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'Sides', position: 1 } });
    const burger = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: mains.id, name: 'Burger', price: '10.00' } });
    const fries = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: sides.id, name: 'Fries', price: '5.00' } });

    // Dine-in: 2 burgers = 20 (no customer).
    const dine = await placeOrder(db, r.id, table.id, [{ menuItemId: burger.id, quantity: 2 }]);
    // Pickup: 3 fries = 15 (customer Ada).
    const pickup = await placeOnlineOrder(db, r.id, { kind: 'pickup', customerName: 'Ada', customerPhone: '416-555-0111' }, [{ menuItemId: fries.id, quantity: 3 }]);
    // Delivery: 1 burger = 10 (customer Bob).
    const deliv = await placeOnlineOrder(db, r.id, { kind: 'delivery', customerName: 'Bob', customerPhone: '416-555-0222', deliveryAddress: '1 Main St' }, [{ menuItemId: burger.id, quantity: 1 }]);
    for (const o of [dine, pickup, deliv]) {
      if (!o.ok) throw new Error('expected ok');
      await db.order.update({ where: { id: o.orderId }, data: { status: 'DELIVERED' } });
    }
    // Payments (settlement records).
    await db.payment.create({ data: { restaurantId: r.id, amount: '20.00', method: 'CASH', status: 'SUCCEEDED' } });
    await db.payment.create({ data: { restaurantId: r.id, amount: '15.00', method: 'CARD', status: 'SUCCEEDED' } });
    await db.payment.create({ data: { restaurantId: r.id, amount: '99.00', method: 'ONLINE', status: 'PENDING' } }); // ignored
    return { r };
  }

  it('breaks down by type, payment method, top items/categories, and top customers', async () => {
    const { r } = await scenario();

    const byType = await salesByType(db, r.id);
    expect(byType.map((t) => [t.orderType, t.revenue])).toEqual([
      ['DINE_IN', 20],
      ['PICKUP', 15],
      ['DELIVERY', 10],
    ]);

    const byMethod = await salesByPaymentMethod(db, r.id);
    expect(byMethod.map((m) => [m.method, m.amount])).toEqual([
      ['CASH', 20],
      ['CARD', 15],
    ]); // PENDING online payment excluded

    const { items, categories } = await topItemsAndCategories(db, r.id);
    expect(items).toEqual([
      { name: 'Burger', quantity: 3, revenue: 30 },
      { name: 'Fries', quantity: 3, revenue: 15 },
    ]);
    expect(categories).toEqual([
      { name: 'Mains', quantity: 3, revenue: 30 },
      { name: 'Sides', quantity: 3, revenue: 15 },
    ]);

    const customers = await topCustomers(db, r.id);
    expect(customers.map((c) => [c.name, c.spend])).toEqual([
      ['Ada', 15],
      ['Bob', 10],
    ]);

    expect(await revenueRows(db, r.id)).toHaveLength(3);
  });

  it('nets refunds out of the payment-method breakdown and totals them', async () => {
    const { r } = await scenario();
    const card = await db.payment.findFirstOrThrow({ where: { restaurantId: r.id, method: 'CARD' } });
    expect((await refundPayment(db, r.id, card.id, { amount: 5 })).ok).toBe(true);

    const byMethod = await salesByPaymentMethod(db, r.id);
    expect(byMethod.find((m) => m.method === 'CARD')).toMatchObject({ amount: 15, refunded: 5, net: 10 });
    expect(byMethod.find((m) => m.method === 'CASH')).toMatchObject({ amount: 20, refunded: 0, net: 20 });

    expect(await refundsTotal(db, r.id)).toBe(5);
  });

  it('totals tips collected over settled payments', async () => {
    const r = await db.restaurant.create({ data: { name: 'Tipsy', slug: 'tipsy' } });
    await db.payment.create({ data: { restaurantId: r.id, amount: '23.00', tipAmount: '3.00', method: 'CARD', status: 'SUCCEEDED' } });
    await db.payment.create({ data: { restaurantId: r.id, amount: '12.00', tipAmount: '2.00', method: 'CASH', status: 'SUCCEEDED' } });
    await db.payment.create({ data: { restaurantId: r.id, amount: '99.00', tipAmount: '9.00', method: 'ONLINE', status: 'PENDING' } }); // ignored
    expect(await tipsTotal(db, r.id)).toBe(5);
  });

  it('totals discounts given across delivered orders', async () => {
    const r = await db.restaurant.create({ data: { name: 'Disco', slug: 'disco' } });
    const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
    const item = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' } });
    // Delivered order with a $4 discount.
    const delivered = await placeOnlineOrder(db, r.id, { kind: 'pickup', customerName: 'A', customerPhone: '416-555-0000' }, [{ menuItemId: item.id, quantity: 4 }]);
    if (!delivered.ok) throw new Error('expected ok');
    await db.order.update({ where: { id: delivered.orderId }, data: { status: 'DELIVERED', discountAmount: '4.00' } });
    // Open order's discount is ignored (not delivered).
    const open = await placeOnlineOrder(db, r.id, { kind: 'pickup', customerName: 'B', customerPhone: '416-555-0001' }, [{ menuItemId: item.id, quantity: 1 }]);
    if (!open.ok) throw new Error('expected ok');
    await db.order.update({ where: { id: open.orderId }, data: { discountAmount: '9.00' } });

    expect(await discountsTotal(db, r.id)).toBe(4);
  });

  it('honors the date range', async () => {
    const { r } = await scenario();
    const future = { gte: new Date('2099-01-01T00:00:00Z') };
    expect((await salesSummary(db, r.id, future)).orders).toBe(0);
    expect(await salesByType(db, r.id, future)).toEqual([]);
    expect(await revenueRows(db, r.id, future)).toEqual([]);
  });

  it('customerExportRows gives per-customer spend + counts (sorted by spend)', async () => {
    const { r } = await scenario();
    const rows = await customerExportRows(db, r.id);
    expect(rows.map((c) => [c.name, c.orders, c.spend])).toEqual([
      ['Ada', 1, 15],
      ['Bob', 1, 10],
    ]);
    expect(rows[0].lastOrderAt).toBeInstanceOf(Date);
  });
});
