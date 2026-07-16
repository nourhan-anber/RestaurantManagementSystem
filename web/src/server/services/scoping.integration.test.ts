import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { createMenuItem, deleteMenuItem, listMenu, updateMenuItem } from './menu';
import { createTable, deleteTable, listTables, updateTable } from './tables';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE order_items, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function twoRestaurants() {
  const r1 = await db.restaurant.create({ data: { name: 'One', slug: 'one' } });
  const r2 = await db.restaurant.create({ data: { name: 'Two', slug: 'two' } });
  return { r1, r2 };
}

const menuInput = { name: 'Dish', category: 'main', price: 10, isAvailable: true };
const tableInput = { number: 1, capacity: 4, isActive: true };

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('menu service tenant scoping', () => {
  it('lists only the tenant’s own items', async () => {
    const { r1, r2 } = await twoRestaurants();
    await createMenuItem(db, r1.id, menuInput);
    expect(await listMenu(db, r1.id)).toHaveLength(1);
    expect(await listMenu(db, r2.id)).toHaveLength(0);
  });

  it('cannot update another tenant’s item (zero rows)', async () => {
    const { r1, r2 } = await twoRestaurants();
    const item = await createMenuItem(db, r1.id, menuInput);
    const res = await updateMenuItem(db, r2.id, item.id, { ...menuInput, name: 'Hacked' });
    expect(res.count).toBe(0);
    const fresh = await db.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(fresh.name).toBe('Dish');
  });

  it('cannot delete another tenant’s item (zero rows)', async () => {
    const { r1, r2 } = await twoRestaurants();
    const item = await createMenuItem(db, r1.id, menuInput);
    const res = await deleteMenuItem(db, r2.id, item.id);
    expect(res.count).toBe(0);
    expect(await db.menuItem.findUnique({ where: { id: item.id } })).not.toBeNull();
  });
});

describe('table service tenant scoping', () => {
  it('cannot update or delete another tenant’s table', async () => {
    const { r1, r2 } = await twoRestaurants();
    const table = await createTable(db, r1.id, tableInput);

    expect((await updateTable(db, r2.id, table.id, { ...tableInput, capacity: 99 })).count).toBe(0);
    expect((await deleteTable(db, r2.id, table.id)).count).toBe(0);

    const fresh = await db.table.findUniqueOrThrow({ where: { id: table.id } });
    expect(fresh.capacity).toBe(4);
    expect(await listTables(db, r1.id)).toHaveLength(1);
    expect(await listTables(db, r2.id)).toHaveLength(0);
  });
});
