import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  getOpeningHours,
  provisionRestaurant,
  setOpeningHours,
  updateRestaurantBranding,
} from './restaurants';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
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

describe('branding + opening hours', () => {
  it('persists branding fields and nulls optionals that are omitted', async () => {
    const { restaurantId } = await provisionRestaurant(db, input);

    await updateRestaurantBranding(db, restaurantId, {
      name: 'Bella Vista',
      description: 'Wood-fired pizza',
      phone: '+1 212 555 0100',
      address: '12 Vine St',
      timezone: 'America/New_York',
      logoUrl: 'https://cdn.test/logo.png',
      onlineOrderingEnabled: true,
    });
    let fresh = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    expect(fresh).toMatchObject({
      description: 'Wood-fired pizza',
      phone: '+1 212 555 0100',
      timezone: 'America/New_York',
      logoUrl: 'https://cdn.test/logo.png',
      onlineOrderingEnabled: true,
    });

    // Omitting optionals clears them back to null.
    await updateRestaurantBranding(db, restaurantId, {
      name: 'Bella Vista',
      timezone: 'UTC',
      onlineOrderingEnabled: false,
    });
    fresh = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    expect(fresh.description).toBeNull();
    expect(fresh.logoUrl).toBeNull();
    expect(fresh.onlineOrderingEnabled).toBe(false);
  });

  it('replaces the whole week of hours atomically and reads them ordered', async () => {
    const { restaurantId } = await provisionRestaurant(db, input);
    const week = Array.from({ length: 7 }, (_, day) => ({
      dayOfWeek: day,
      opensMinutes: 660,
      closesMinutes: 1320,
      isClosed: day === 1,
    }));

    await setOpeningHours(db, restaurantId, week);
    let rows = await getOpeningHours(db, restaurantId);
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(rows.find((r) => r.dayOfWeek === 1)?.isClosed).toBe(true);

    // Re-saving replaces (no duplicate day rows, @@unique holds).
    await setOpeningHours(db, restaurantId, week.map((r) => ({ ...r, opensMinutes: 600 })));
    rows = await getOpeningHours(db, restaurantId);
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.opensMinutes === 600)).toBe(true);
  });

  it('resolves a province preset to its rate + label (custom values ignored)', async () => {
    const { restaurantId } = await provisionRestaurant(db, input);
    await updateRestaurantBranding(db, restaurantId, {
      name: 'Bella Vista',
      timezone: 'America/Toronto',
      onlineOrderingEnabled: false,
      taxEnabled: true,
      taxRegion: 'CA-ON',
      taxRatePercent: 99, // ignored — preset wins
      taxLabel: 'Bogus',
    });
    const fresh = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    expect(fresh.taxEnabled).toBe(true);
    expect(Number(fresh.taxRatePercent)).toBe(13);
    expect(fresh.taxLabel).toBe('HST');
    expect(fresh.taxRegion).toBe('CA-ON');
  });

  it('stores a custom rate + label when region is custom', async () => {
    const { restaurantId } = await provisionRestaurant(db, input);
    await updateRestaurantBranding(db, restaurantId, {
      name: 'Bella Vista',
      timezone: 'America/Toronto',
      onlineOrderingEnabled: false,
      taxEnabled: true,
      taxRegion: 'custom',
      taxRatePercent: 8.25,
      taxLabel: 'City Tax',
    });
    const fresh = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    expect(Number(fresh.taxRatePercent)).toBe(8.25);
    expect(fresh.taxLabel).toBe('City Tax');
    expect(fresh.taxRegion).toBe('custom');
  });

  it('persists the storefront template + accent color', async () => {
    const { restaurantId } = await provisionRestaurant(db, input);
    await updateRestaurantBranding(db, restaurantId, {
      name: 'Bella Vista',
      timezone: 'America/Toronto',
      onlineOrderingEnabled: true,
      storefrontTemplate: 'banner',
      themeColor: '#1f6f5c',
    });
    const fresh = await db.restaurant.findUniqueOrThrow({ where: { id: restaurantId } });
    expect(fresh.storefrontTemplate).toBe('banner');
    expect(fresh.themeColor).toBe('#1f6f5c');
  });
});
