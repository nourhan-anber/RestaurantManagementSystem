import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  advanceOrderStatus,
  closeBill,
  listKitchenOrders,
  placeOrder,
} from './orders';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE order_items, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture() {
  const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
  const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
  const item = await db.menuItem.create({
    data: { restaurantId: r.id, category: 'main', name: 'Dish', price: '10.00' },
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
    expect(kds[0].table.number).toBe(1);
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

  it('advance is tenant-scoped; closing the bill reopens the table', async () => {
    const { r, table, item } = await fixture();
    const placed = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    if (!placed.ok) throw new Error('expected ok');

    // Cross-tenant advance touches zero rows.
    expect((await advanceOrderStatus(db, 9999, placed.orderId, 'PREPARING')).count).toBe(0);
    expect((await advanceOrderStatus(db, r.id, placed.orderId, 'PREPARING')).count).toBe(1);

    await closeBill(db, r.id, table.id);
    expect((await db.table.findUniqueOrThrow({ where: { id: table.id } })).status).toBe('OPEN');
    expect(await listKitchenOrders(db, r.id)).toHaveLength(0);
  });
});
