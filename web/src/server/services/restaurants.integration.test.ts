import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { provisionRestaurant } from './restaurants';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, restaurants, users RESTART IDENTITY CASCADE',
  );
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

const input = {
  name: 'Bella Vista',
  ownerName: 'Sam Owner',
  ownerEmail: 'sam@bella.test',
  ownerPassword: 'supersecret',
};

describe('provisionRestaurant', () => {
  it('creates the restaurant, owner user, and OWNER membership', async () => {
    const { restaurantId, slug } = await provisionRestaurant(db, input);
    expect(slug).toBe('bella-vista');

    const restaurant = await db.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      include: { memberships: { include: { user: true } } },
    });
    expect(restaurant.memberships).toHaveLength(1);
    expect(restaurant.memberships[0].role).toBe('OWNER');
    expect(restaurant.memberships[0].user.email).toBe('sam@bella.test');
    expect(restaurant.memberships[0].user.passwordHash).toBeTruthy();
  });

  it('resolves slug collisions deterministically', async () => {
    const a = await provisionRestaurant(db, { ...input, ownerEmail: 'a@x.test' });
    const b = await provisionRestaurant(db, { ...input, ownerEmail: 'b@x.test' });
    expect([a.slug, b.slug]).toEqual(['bella-vista', 'bella-vista-2']);
  });

  it('reuses an existing owner for a second restaurant (new membership)', async () => {
    await provisionRestaurant(db, input);
    await provisionRestaurant(db, { ...input, name: 'Bella Vista Two' });

    const user = await db.user.findUniqueOrThrow({
      where: { email: 'sam@bella.test' },
      include: { memberships: true },
    });
    expect(user.memberships).toHaveLength(2);
  });
});
