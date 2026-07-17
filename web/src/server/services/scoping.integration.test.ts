import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { createMenuItem, deleteMenuItem, listMenu, setItemAvailability, updateMenuItem } from './menu';
import { createTable, deleteTable, listTables, updateTable } from './tables';
import { deleteCategory, updateCategory } from './categories';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function twoRestaurants() {
  const r1 = await db.restaurant.create({ data: { name: 'One', slug: 'one' } });
  const r2 = await db.restaurant.create({ data: { name: 'Two', slug: 'two' } });
  const cat1 = await db.menuCategory.create({ data: { restaurantId: r1.id, name: 'main', position: 0 } });
  const cat2 = await db.menuCategory.create({ data: { restaurantId: r2.id, name: 'main', position: 0 } });
  return { r1, r2, cat1, cat2 };
}

const menuBase = { name: 'Dish', price: 10, isAvailable: true, dietaryTags: [], spiceLevel: 0 };
const tableInput = { number: 1, capacity: 4, isActive: true };

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('menu service tenant scoping', () => {
  it('lists only the tenant’s own items', async () => {
    const { r1, r2, cat1 } = await twoRestaurants();
    await createMenuItem(db, r1.id, { ...menuBase, categoryId: cat1.id });
    expect(await listMenu(db, r1.id)).toHaveLength(1);
    expect(await listMenu(db, r2.id)).toHaveLength(0);
  });

  it('cannot update another tenant’s item (zero rows)', async () => {
    const { r1, r2, cat1 } = await twoRestaurants();
    const item = await createMenuItem(db, r1.id, { ...menuBase, categoryId: cat1.id });
    const res = await updateMenuItem(db, r2.id, item.id, { ...menuBase, categoryId: cat1.id, name: 'Hacked' });
    expect(res.count).toBe(0);
    const fresh = await db.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(fresh.name).toBe('Dish');
  });

  it('cannot delete another tenant’s item (zero rows)', async () => {
    const { r1, r2, cat1 } = await twoRestaurants();
    const item = await createMenuItem(db, r1.id, { ...menuBase, categoryId: cat1.id });
    const res = await deleteMenuItem(db, r2.id, item.id);
    expect(res.count).toBe(0);
    expect(await db.menuItem.findUnique({ where: { id: item.id } })).not.toBeNull();
  });

  it('86 toggles availability, tenant-scoped', async () => {
    const { r1, r2, cat1 } = await twoRestaurants();
    const item = await createMenuItem(db, r1.id, { ...menuBase, categoryId: cat1.id });
    expect(item.isAvailable).toBe(true);

    // Another tenant can't flip it.
    expect((await setItemAvailability(db, r2.id, item.id, false)).count).toBe(0);
    expect((await db.menuItem.findUniqueOrThrow({ where: { id: item.id } })).isAvailable).toBe(true);

    // Owner 86's it, then re-enables.
    expect((await setItemAvailability(db, r1.id, item.id, false)).count).toBe(1);
    expect((await db.menuItem.findUniqueOrThrow({ where: { id: item.id } })).isAvailable).toBe(false);
    await setItemAvailability(db, r1.id, item.id, true);
    expect((await db.menuItem.findUniqueOrThrow({ where: { id: item.id } })).isAvailable).toBe(true);
  });
});

describe('category service tenant scoping', () => {
  it('cannot update or delete another tenant’s category', async () => {
    const { r2, cat1 } = await twoRestaurants();

    expect((await updateCategory(db, r2.id, cat1.id, { name: 'Hacked', isHidden: false })).count).toBe(0);
    expect(await deleteCategory(db, r2.id, cat1.id)).toEqual({ ok: false, reason: 'not_found' });

    const fresh = await db.menuCategory.findUniqueOrThrow({ where: { id: cat1.id } });
    expect(fresh.name).toBe('main');
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
