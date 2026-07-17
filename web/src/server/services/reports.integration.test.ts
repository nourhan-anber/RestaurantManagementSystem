import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOrder } from './orders';
import { salesSummary, topItems } from './reports';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
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
