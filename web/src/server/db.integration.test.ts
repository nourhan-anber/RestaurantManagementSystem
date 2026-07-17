import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { OrderStatus, TableStatus } from '@/generated/prisma/enums';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  // Throwaway test DB — truncate everything and reset serials between tests.
  await db.$executeRawUnsafe(
    'TRUNCATE order_items, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, restaurants RESTART IDENTITY CASCADE',
  );
}

async function makeFixture() {
  const restaurant = await db.restaurant.create({ data: { name: 'Test', slug: 'test' } });
  const table = await db.table.create({
    data: { restaurantId: restaurant.id, number: 1 },
  });
  const category = await db.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'main-course', position: 0 },
  });
  const item = await db.menuItem.create({
    data: { restaurantId: restaurant.id, categoryId: category.id, name: 'Dish', price: '10.00' },
  });
  return { restaurant, table, item };
}

async function tableStatus(id: number) {
  return (await db.table.findUniqueOrThrow({ where: { id } })).status;
}

function orderWithItem(restaurantId: number, tableId: number, menuItemId: number) {
  return db.order.create({
    data: {
      restaurantId,
      tableId,
      items: { create: [{ menuItemId, quantity: 1, unitPrice: '10.00' }] },
    },
  });
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('table-status triggers', () => {
  it('occupies the table when an order is inserted', async () => {
    const { restaurant, table, item } = await makeFixture();
    expect(await tableStatus(table.id)).toBe(TableStatus.OPEN);

    await orderWithItem(restaurant.id, table.id, item.id);

    expect(await tableStatus(table.id)).toBe(TableStatus.OCCUPIED);
  });

  it('reopens the table only when the last active order closes', async () => {
    const { restaurant, table, item } = await makeFixture();
    const o1 = await orderWithItem(restaurant.id, table.id, item.id);
    const o2 = await orderWithItem(restaurant.id, table.id, item.id);
    expect(await tableStatus(table.id)).toBe(TableStatus.OCCUPIED);

    // First order delivered, but a second is still active -> stays occupied.
    await db.order.update({ where: { id: o1.id }, data: { status: OrderStatus.DELIVERED } });
    expect(await tableStatus(table.id)).toBe(TableStatus.OCCUPIED);

    // Last active order closes -> table reopens.
    await db.order.update({ where: { id: o2.id }, data: { status: OrderStatus.DELIVERED } });
    expect(await tableStatus(table.id)).toBe(TableStatus.OPEN);
  });

  it('reopens the table when the only order is cancelled', async () => {
    const { restaurant, table, item } = await makeFixture();
    const o = await orderWithItem(restaurant.id, table.id, item.id);
    expect(await tableStatus(table.id)).toBe(TableStatus.OCCUPIED);

    await db.order.update({ where: { id: o.id }, data: { status: OrderStatus.CANCELLED } });
    expect(await tableStatus(table.id)).toBe(TableStatus.OPEN);
  });
});

describe('order_items quantity CHECK', () => {
  it('rejects a non-positive quantity', async () => {
    const { restaurant, table, item } = await makeFixture();
    const order = await db.order.create({
      data: { restaurantId: restaurant.id, tableId: table.id },
    });

    await expect(
      db.orderItem.create({
        data: { orderId: order.id, menuItemId: item.id, quantity: 0, unitPrice: '10.00' },
      }),
    ).rejects.toThrow();
  });
});
