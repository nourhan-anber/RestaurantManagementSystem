import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  createGroup,
  createOption,
  deleteGroup,
  deleteOption,
  updateGroup,
  updateOption,
} from './modifiers';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function restaurantWithItem(slug: string) {
  const r = await db.restaurant.create({ data: { name: slug, slug } });
  const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
  const item = await db.menuItem.create({
    data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
  });
  return { r, item };
}

const groupInput = { name: 'Size', minSelect: 1, maxSelect: 1 };
const optionInput = { name: 'Large', priceDelta: 4, isAvailable: true };

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('modifiers service', () => {
  it('creates a group and options on the tenant’s own item', async () => {
    const { r, item } = await restaurantWithItem('one');
    expect(await createGroup(db, r.id, item.id, groupInput)).toEqual({ ok: true });

    const group = await db.modifierGroup.findFirstOrThrow({ where: { menuItemId: item.id } });
    expect(await createOption(db, r.id, group.id, optionInput)).toEqual({ ok: true });

    const withOptions = await db.modifierGroup.findUniqueOrThrow({
      where: { id: group.id },
      include: { options: true },
    });
    expect(withOptions.options).toHaveLength(1);
    expect(Number(withOptions.options[0].priceDelta)).toBe(4);
  });

  it('cannot add a group to another tenant’s item', async () => {
    const { item: item1 } = await restaurantWithItem('one');
    const { r: r2 } = await restaurantWithItem('two');
    expect(await createGroup(db, r2.id, item1.id, groupInput)).toEqual({ ok: false });
    expect(await db.modifierGroup.count({ where: { menuItemId: item1.id } })).toBe(0);
  });

  it('cannot update/delete another tenant’s group or option', async () => {
    const { r: r1, item } = await restaurantWithItem('one');
    const { r: r2 } = await restaurantWithItem('two');
    await createGroup(db, r1.id, item.id, groupInput);
    const group = await db.modifierGroup.findFirstOrThrow({ where: { menuItemId: item.id } });
    await createOption(db, r1.id, group.id, optionInput);
    const option = await db.modifierOption.findFirstOrThrow({ where: { groupId: group.id } });

    expect(await updateGroup(db, r2.id, group.id, { ...groupInput, name: 'Hacked' })).toEqual({ ok: false });
    expect(await deleteGroup(db, r2.id, group.id)).toEqual({ ok: false });
    expect(await createOption(db, r2.id, group.id, optionInput)).toEqual({ ok: false });
    expect(await updateOption(db, r2.id, option.id, { ...optionInput, name: 'Hacked' })).toEqual({ ok: false });
    expect(await deleteOption(db, r2.id, option.id)).toEqual({ ok: false });

    // Nothing changed.
    expect((await db.modifierGroup.findUniqueOrThrow({ where: { id: group.id } })).name).toBe('Size');
    expect(await db.modifierOption.count({ where: { groupId: group.id } })).toBe(1);
  });
});
