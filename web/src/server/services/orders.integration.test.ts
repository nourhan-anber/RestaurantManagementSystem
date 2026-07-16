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
    'TRUNCATE order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, restaurants, users RESTART IDENTITY CASCADE',
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
