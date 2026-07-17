import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder } from './orders';
import { awardLoyaltyForOrder } from './loyalty';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, points_ledger, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture(loyaltyEnabled = true) {
  const r = await db.restaurant.create({
    data: { name: 'Bella', slug: 'bella', loyaltyEnabled, pointsPerDollar: 1 },
  });
  const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
  const item = await db.menuItem.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' } });
  return { r, item };
}

async function order(r: { id: number }, item: { id: number }, qty = 3) {
  const placed = await placeOnlineOrder(
    db,
    r.id,
    { kind: 'pickup', customerName: 'Ada', customerPhone: '416-555-0100' },
    [{ menuItemId: item.id, quantity: qty }],
  );
  if (!placed.ok) throw new Error('expected ok');
  return placed.orderId;
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('awardLoyaltyForOrder', () => {
  it('awards floor(total × rate) points to the order customer and is idempotent', async () => {
    const { r, item } = await fixture();
    const orderId = await order(r, item, 3); // total $30

    expect(await awardLoyaltyForOrder(db, r.id, orderId)).toBe(30);

    const customer = await db.customer.findFirstOrThrow({ where: { restaurantId: r.id } });
    expect(customer.points).toBe(30);
    expect(await db.pointsLedger.count({ where: { customerId: customer.id } })).toBe(1);

    // Second call is a no-op (already awarded for this order).
    expect(await awardLoyaltyForOrder(db, r.id, orderId)).toBe(0);
    expect((await db.customer.findUniqueOrThrow({ where: { id: customer.id } })).points).toBe(30);
  });

  it('no-ops when loyalty is disabled', async () => {
    const { r, item } = await fixture(false);
    const orderId = await order(r, item, 2);
    expect(await awardLoyaltyForOrder(db, r.id, orderId)).toBe(0);
    expect(await db.pointsLedger.count()).toBe(0);
  });

  it('no-ops for an order without a linked customer', async () => {
    const { r } = await fixture();
    // A customerless order (e.g. a walk-in) earns nothing.
    const bare = await db.order.create({ data: { restaurantId: r.id, orderType: 'PICKUP', subtotal: '10', total: '10' } });
    expect(await awardLoyaltyForOrder(db, r.id, bare.id)).toBe(0);
  });

  it('is tenant-scoped', async () => {
    const { r, item } = await fixture();
    const orderId = await order(r, item, 1);
    expect(await awardLoyaltyForOrder(db, 9999, orderId)).toBe(0);
  });
});
