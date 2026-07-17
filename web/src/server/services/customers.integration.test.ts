import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder, placeOrder } from './orders';
import { getCustomer, listCustomers, upsertCustomerForOrder } from './customers';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE reservations, waitlist_entries, customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, points_ledger, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
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

    const { rows, total } = await listCustomers(db, r.id);
    expect(total).toBe(1);
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

describe('listCustomers search + pagination, getCustomer', () => {
  it('searches by name, email, and phone (formatting-insensitive), tenant-scoped', async () => {
    const r = await db.restaurant.create({ data: { name: 'R', slug: 'r' } });
    const other = await db.restaurant.create({ data: { name: 'O', slug: 'o' } });
    await upsertCustomerForOrder(db, r.id, { name: 'Ada Lovelace', phone: '416-555-0111', email: 'ada@x.com' });
    await upsertCustomerForOrder(db, r.id, { name: 'Bob Jones', phone: '647-555-0222', email: 'bob@y.com' });
    await upsertCustomerForOrder(db, other.id, { name: 'Ada Other', email: 'ada@z.com' });

    expect((await listCustomers(db, r.id, { search: 'lovelace' })).total).toBe(1);
    expect((await listCustomers(db, r.id, { search: 'bob@y' })).total).toBe(1);
    // Phone search ignores formatting.
    expect((await listCustomers(db, r.id, { search: '(416) 555-0111' })).total).toBe(1);
    expect((await listCustomers(db, r.id, { search: 'ada' })).total).toBe(1); // not the other tenant's Ada
    expect((await listCustomers(db, r.id, { search: 'nobody' })).total).toBe(0);
  });

  it('paginates with a stable total', async () => {
    const r = await db.restaurant.create({ data: { name: 'R', slug: 'r' } });
    for (let i = 0; i < 5; i += 1) {
      await upsertCustomerForOrder(db, r.id, { name: `C${i}`, email: `c${i}@x.com` });
    }
    const p1 = await listCustomers(db, r.id, { skip: 0, take: 2 });
    const p2 = await listCustomers(db, r.id, { skip: 2, take: 2 });
    expect(p1.total).toBe(5);
    expect(p1.rows).toHaveLength(2);
    expect(p2.rows).toHaveLength(2);
    expect(p1.rows[0].id).not.toBe(p2.rows[0].id);
  });

  it('getCustomer is tenant-scoped', async () => {
    const r = await db.restaurant.create({ data: { name: 'R', slug: 'r' } });
    const other = await db.restaurant.create({ data: { name: 'O', slug: 'o' } });
    const id = await upsertCustomerForOrder(db, r.id, { email: 'x@x.com' });
    if (!id) throw new Error('expected id');
    expect((await getCustomer(db, r.id, id))?.id).toBe(id);
    expect(await getCustomer(db, other.id, id)).toBeNull();
  });
});
