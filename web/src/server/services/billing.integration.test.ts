import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { applySubscription, getSubscription } from './billing';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('applySubscription', () => {
  it('creates then updates a restaurant subscription (idempotent upsert)', async () => {
    const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });

    await applySubscription(db, {
      restaurantId: r.id,
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_1',
      status: 'ACTIVE',
      priceId: 'price_1',
    });
    expect((await getSubscription(db, r.id))?.status).toBe('ACTIVE');

    await applySubscription(db, { restaurantId: r.id, status: 'PAST_DUE' });
    const sub = await getSubscription(db, r.id);
    expect(sub?.status).toBe('PAST_DUE');
    // Existing Stripe ids preserved on update.
    expect(sub?.stripeSubscriptionId).toBe('sub_1');
  });
});
