import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder, placeOrder } from './orders';
import { listCustomers, upsertCustomerForOrder } from './customers';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture() {
  const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
  const table = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
  const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
  const item = await db.menuItem.create({
    data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
  });
  return { r, table, item };
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('upsertCustomerForOrder', () => {
  it('normalizes phone, dedupes across formats, and enriches missing fields', async () => {
    const { r } = await fixture();
    const first = await upsertCustomerForOrder(db, r.id, { name: 'Ada', phone: '(416) 555-0199' });
    const again = await upsertCustomerForOrder(db, r.id, { phone: '4165550199', email: 'ada@x.com' });
    expect(again).toBe(first);

    const c = await db.customer.findUniqueOrThrow({ where: { id: first! } });
    expect(c.phone).toBe('+14165550199');
    expect(c.name).toBe('Ada'); // preserved
    expect(c.email).toBe('ada@x.com'); // enriched
    expect(await db.customer.count({ where: { restaurantId: r.id } })).toBe(1);
  });

  it('dedupes by email when phone is absent, and is tenant-scoped', async () => {
    const { r } = await fixture();
    const other = await db.restaurant.create({ data: { name: 'Other', slug: 'other' } });
    const a = await upsertCustomerForOrder(db, r.id, { email: 'SAM@x.com' });
    const b = await upsertCustomerForOrder(db, r.id, { email: 'sam@x.com' });
    expect(b).toBe(a); // case-insensitive email match
    // Same email in another restaurant is a different customer.
    const c = await upsertCustomerForOrder(db, other.id, { email: 'sam@x.com' });
    expect(c).not.toBe(a);
  });

  it('returns null when there is nothing to identify the customer by', async () => {
    const { r } = await fixture();
    expect(await upsertCustomerForOrder(db, r.id, { name: 'No Contact' })).toBeNull();
    expect(await upsertCustomerForOrder(db, r.id, { phone: 'garbage' })).toBeNull();
    expect(await db.customer.count()).toBe(0);
  });
});

describe('customers linked to orders', () => {
  it('creates and links a customer for an online order (phone)', async () => {
    const { r, item } = await fixture();
    const res = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Ada', customerPhone: '416-555-0199' },
      [{ menuItemId: item.id, quantity: 1 }],
    );
    if (!res.ok) throw new Error('expected ok');

    const order = await db.order.findUniqueOrThrow({ where: { id: res.orderId } });
    expect(order.customerId).not.toBeNull();
    const customer = await db.customer.findUniqueOrThrow({ where: { id: order.customerId! } });
    expect(customer.phone).toBe('+14165550199');
  });

  it('links repeat orders (dine-in email then online phone stay separate; same email merges)', async () => {
    const { r, table, item } = await fixture();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }], {
      guestName: 'Sam',
      guestEmail: 'sam@x.com',
    });
    await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '416-555-0100' },
      [{ menuItemId: item.id, quantity: 1 }],
      { guestEmail: 'sam@x.com' },
    );

    const rows = await listCustomers(db, r.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].orders).toBe(2);
    expect(rows[0].email).toBe('sam@x.com');
    expect(rows[0].phone).toBe('+14165550100');
  });

  it('does not create a customer for a bare dine-in order (no contact)', async () => {
    const { r, table, item } = await fixture();
    await placeOrder(db, r.id, table.id, [{ menuItemId: item.id, quantity: 1 }]);
    expect(await db.customer.count({ where: { restaurantId: r.id } })).toBe(0);
  });
});
