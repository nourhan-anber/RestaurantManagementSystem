import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder, placeOrder } from './orders';
import { dashboardStats } from './dashboard';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture() {
  const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
  const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
  const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
  const item = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' } });
  return { r, table, item };
}

const now = new Date('2026-07-16T12:00:00Z');

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('dashboardStats', () => {
  it('counts active orders, 86d items, and lists upcoming scheduled orders', async () => {
    const { r, table, item } = await fixture();

    // Two active kitchen orders.
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    const second = await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    if (!second.ok) throw new Error('expected ok');
    // A delivered order should not count as active.
    await db.order.update({ where: { id: second.orderId }, data: { status: 'DELIVERED' } });

    // 86 the item.
    const extra = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: (await db.menuCategory.findFirstOrThrow({ where: { restaurantId: r.id } })).id, name: 'Special', price: '9.00', isAvailable: false } });
    expect(extra.isAvailable).toBe(false);

    // A future scheduled pickup + a past one (past should be excluded).
    const future = await placeOnlineOrder(db, r.id, { kind: 'pickup', customerName: 'Ada', customerPhone: '416-555-0000', requestedTime: new Date(now.getTime() + 3_600_000) }, [{ menuItemId: item.id, quantity: 1 }]);
    if (!future.ok) throw new Error('expected ok');
    await placeOnlineOrder(db, r.id, { kind: 'pickup', customerName: 'Old', customerPhone: '416-555-0001', requestedTime: new Date(now.getTime() - 3_600_000) }, [{ menuItemId: item.id, quantity: 1 }]);

    const stats = await dashboardStats(db, r.id, now);
    expect(stats.activeOrders).toBe(3); // 1 dine-in open + 2 online pickups (all PENDING)
    expect(stats.eightySixCount).toBe(1);
    expect(stats.upcoming).toHaveLength(1);
    expect(stats.upcoming[0]).toMatchObject({ name: 'Ada', orderType: 'PICKUP' });
  });

  it('is tenant-scoped', async () => {
    const { r, table, item } = await fixture();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    const stats = await dashboardStats(db, 9999, now);
    expect(stats).toEqual({ activeOrders: 0, eightySixCount: 0, upcoming: [] });
  });
});
