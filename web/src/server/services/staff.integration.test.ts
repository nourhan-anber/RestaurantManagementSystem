import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { acceptInvite, createInvite, hashInviteToken } from './staff';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}
async function restaurant() {
  return db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('staff invites', () => {
  it('accepting an invite creates the user + membership and marks it used', async () => {
    const r = await restaurant();
    const { token } = await createInvite(db, r.id, 'chef@bella.test', 'CHEF');

    const result = await acceptInvite(db, token, { name: 'Chef Sam', password: 'longenough' });
    expect(result).toEqual({ ok: true, restaurantSlug: 'bella' });

    const user = await db.user.findUniqueOrThrow({
      where: { email: 'chef@bella.test' },
      include: { memberships: true },
    });
    expect(user.memberships[0].role).toBe('CHEF');
    expect(user.passwordHash).toBeTruthy();

    const invite = await db.staffInvite.findFirstOrThrow({ where: { tokenHash: hashInviteToken(token) } });
    expect(invite.acceptedAt).not.toBeNull();
  });

  it('rejects re-use of an accepted invite', async () => {
    const r = await restaurant();
    const { token } = await createInvite(db, r.id, 'chef@bella.test', 'CHEF');
    await acceptInvite(db, token, { name: 'Sam', password: 'longenough' });
    expect(await acceptInvite(db, token, { name: 'Sam', password: 'longenough' })).toEqual({
      ok: false,
      reason: 'used',
    });
  });

  it('rejects an unknown token', async () => {
    expect(await acceptInvite(db, 'bogus', { name: 'Sam', password: 'longenough' })).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects an expired invite', async () => {
    const r = await restaurant();
    const { token } = await createInvite(db, r.id, 'srv@bella.test', 'SERVER');
    await db.staffInvite.updateMany({
      where: { restaurantId: r.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await acceptInvite(db, token, { name: 'Srv', password: 'longenough' })).toEqual({
      ok: false,
      reason: 'expired',
    });
  });
});
