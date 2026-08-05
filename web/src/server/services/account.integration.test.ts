import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { verifyPassword } from '@/server/auth-helpers';
import { changePassword, createPasswordReset, resetPassword, updateName } from './account';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE reservations, waitlist_entries, customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, points_ledger, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function user(email = 'owner@b.test') {
  return db.user.create({ data: { email, name: 'Owner', passwordHash: await bcrypt.hash('original1', 10) } });
}

const now = new Date('2026-07-16T12:00:00Z');

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('createPasswordReset', () => {
  it('issues a token for a known email and null for an unknown one', async () => {
    const u = await user();
    const issued = await createPasswordReset(db, 'OWNER@B.TEST', now); // case-insensitive
    expect(issued?.userId).toBe(u.id);
    expect((await db.passwordResetToken.count({ where: { userId: u.id } }))).toBe(1);

    expect(await createPasswordReset(db, 'nobody@b.test', now)).toBeNull();
  });
});

describe('resetPassword', () => {
  it('sets a new password, is single-use, and invalidates sibling tokens', async () => {
    const u = await user();
    const issued = await createPasswordReset(db, u.email, now);
    if (!issued) throw new Error('expected a token');
    // A second outstanding token for the same user.
    const other = await createPasswordReset(db, u.email, now);
    if (!other) throw new Error('expected a token');

    expect(await resetPassword(db, issued.token, 'brandnew1', now)).toEqual({ ok: true });

    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await verifyPassword('brandnew1', after.passwordHash)).toBe(true);
    expect(await verifyPassword('original1', after.passwordHash)).toBe(false);

    // The used token can't be replayed…
    expect(await resetPassword(db, issued.token, 'again0000', now)).toEqual({ ok: false, reason: 'used' });
    // …and the sibling token was invalidated too.
    expect(await resetPassword(db, other.token, 'again0000', now)).toEqual({ ok: false, reason: 'used' });
  });

  it('rejects an unknown or expired token', async () => {
    const u = await user();
    expect(await resetPassword(db, 'bogus', 'whatever1', now)).toEqual({ ok: false, reason: 'invalid' });

    const issued = await createPasswordReset(db, u.email, now);
    if (!issued) throw new Error('expected a token');
    const later = new Date(now.getTime() + 61 * 60_000); // past the 60-min TTL
    expect(await resetPassword(db, issued.token, 'whatever1', later)).toEqual({ ok: false, reason: 'expired' });
  });
});

describe('changePassword + updateName', () => {
  it('changes the password only with the correct current one', async () => {
    const u = await user();
    expect(await changePassword(db, u.id, 'wrong', 'newpass12')).toEqual({ ok: false, reason: 'wrong_password' });
    expect(await changePassword(db, u.id, 'original1', 'newpass12')).toEqual({ ok: true });

    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(await verifyPassword('newpass12', after.passwordHash)).toBe(true);
  });

  it('reports a missing user', async () => {
    expect(await changePassword(db, 'nope', 'x', 'newpass12')).toEqual({ ok: false, reason: 'not_found' });
  });

  it('updates the display name', async () => {
    const u = await user();
    await updateName(db, u.id, '  Ada Lovelace  ');
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).name).toBe('Ada Lovelace');
  });
});
