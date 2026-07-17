import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  createCategory,
  deleteCategory,
  listCategories,
  moveCategory,
  setCategoryHidden,
  updateCategory,
} from './categories';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}
const restaurant = () => db.restaurant.create({ data: { name: 'B', slug: 'b' } });

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('categories service', () => {
  it('creates with incrementing positions and lists ordered', async () => {
    const r = await restaurant();
    await createCategory(db, r.id, { name: 'Mains', isHidden: false });
    await createCategory(db, r.id, { name: 'Drinks', isHidden: false });
    expect((await listCategories(db, r.id)).map((c) => [c.name, c.position])).toEqual([
      ['Mains', 0],
      ['Drinks', 1],
    ]);
  });

  it('reorders by swapping positions and no-ops at the edge', async () => {
    const r = await restaurant();
    const a = await createCategory(db, r.id, { name: 'A', isHidden: false });
    await createCategory(db, r.id, { name: 'B', isHidden: false });

    await moveCategory(db, r.id, a.id, 'down');
    expect((await listCategories(db, r.id)).map((c) => c.name)).toEqual(['B', 'A']);

    const first = (await listCategories(db, r.id))[0];
    await moveCategory(db, r.id, first.id, 'up'); // already at top -> no change
    expect((await listCategories(db, r.id)).map((c) => c.name)).toEqual(['B', 'A']);
  });

  it('renames and hides', async () => {
    const r = await restaurant();
    const cat = await createCategory(db, r.id, { name: 'Old', isHidden: false });
    await updateCategory(db, r.id, cat.id, { name: 'New', isHidden: false });
    await setCategoryHidden(db, r.id, cat.id, true);
    const fresh = await db.menuCategory.findUniqueOrThrow({ where: { id: cat.id } });
    expect(fresh.name).toBe('New');
    expect(fresh.isHidden).toBe(true);
  });

  it('refuses to delete a category with items, allows empty deletes', async () => {
    const r = await restaurant();
    const cat = await createCategory(db, r.id, { name: 'Mains', isHidden: false });
    await db.menuItem.create({ data: { restaurantId: r.id, categoryId: cat.id, name: 'X', price: '1.00' } });
    expect(await deleteCategory(db, r.id, cat.id)).toEqual({ ok: false, reason: 'has_items' });

    const empty = await createCategory(db, r.id, { name: 'Empty', isHidden: false });
    expect(await deleteCategory(db, r.id, empty.id)).toEqual({ ok: true });
    expect(await deleteCategory(db, r.id, 99999)).toEqual({ ok: false, reason: 'not_found' });
  });
});
