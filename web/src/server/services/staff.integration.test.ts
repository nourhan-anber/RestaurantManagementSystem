import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  acceptInvite,
  changeMemberRole,
  createInvite,
  hashInviteToken,
  removeMember,
  revokeInvite,
} from './staff';

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

describe('member management', () => {
  async function withMembers() {
    const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
    const owner = await db.user.create({ data: { email: 'owner@b.test', name: 'Own', passwordHash: 'x' } });
    const chef = await db.user.create({ data: { email: 'chef@b.test', name: 'Chef', passwordHash: 'x' } });
    await db.membership.create({ data: { userId: owner.id, restaurantId: r.id, role: 'OWNER' } });
    await db.membership.create({ data: { userId: chef.id, restaurantId: r.id, role: 'CHEF' } });
    return { r, owner, chef };
  }

  it('changes a member role and removes a member', async () => {
    const { r, chef } = await withMembers();
    expect(await changeMemberRole(db, r.id, chef.id, 'MANAGER')).toEqual({ ok: true });
    expect(
      (await db.membership.findUniqueOrThrow({ where: { userId_restaurantId: { userId: chef.id, restaurantId: r.id } } })).role,
    ).toBe('MANAGER');

    expect(await removeMember(db, r.id, chef.id)).toEqual({ ok: true });
    expect(await db.membership.count({ where: { restaurantId: r.id } })).toBe(1);
  });

  it('refuses to remove or demote the last owner', async () => {
    const { r, owner } = await withMembers();
    expect(await removeMember(db, r.id, owner.id)).toEqual({ ok: false, reason: 'last_owner' });
    expect(await changeMemberRole(db, r.id, owner.id, 'MANAGER')).toEqual({ ok: false, reason: 'last_owner' });
    expect(await db.membership.count({ where: { restaurantId: r.id, role: 'OWNER' } })).toBe(1);
  });

  it('revokes a pending invite but not an accepted one', async () => {
    const r = await db.restaurant.create({ data: { name: 'X', slug: 'x' } });
    const { token } = await createInvite(db, r.id, 'p@x.test', 'CHEF');
    const pending = await db.staffInvite.findFirstOrThrow({ where: { restaurantId: r.id } });
    const accepted = await createInvite(db, r.id, 'a@x.test', 'SERVER');
    await acceptInvite(db, accepted.token, { name: 'A', password: 'longenough' });
    const acceptedRow = await db.staffInvite.findFirstOrThrow({ where: { email: 'a@x.test' } });

    expect((await revokeInvite(db, r.id, pending.id)).count).toBe(1);
    expect(await db.staffInvite.findUnique({ where: { id: pending.id } })).toBeNull();
    // Accepted invite is not revocable.
    expect((await revokeInvite(db, r.id, acceptedRow.id)).count).toBe(0);
    // Unknown token no longer resolves (revoked).
    expect(await db.staffInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } })).toBeNull();
  });
});
