import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@/generated/prisma/client';
import type { Role } from '@/generated/prisma/enums';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** We store only the hash of the invite token; the raw token lives in the link. */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface CreateInviteResult {
  token: string;
  inviteId: string;
}

export async function createInvite(
  db: PrismaClient,
  restaurantId: number,
  email: string,
  role: Role,
): Promise<CreateInviteResult> {
  const token = randomBytes(24).toString('base64url');
  const invite = await db.staffInvite.create({
    data: {
      restaurantId,
      email,
      role,
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  return { token, inviteId: invite.id };
}

export type AcceptInviteResult =
  | { ok: true; restaurantSlug: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

export async function acceptInvite(
  db: PrismaClient,
  token: string,
  input: { name: string; password: string },
): Promise<AcceptInviteResult> {
  const invite = await db.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { restaurant: { select: { slug: true } } },
  });
  if (!invite) return { ok: false, reason: 'invalid' };
  if (invite.acceptedAt) return { ok: false, reason: 'used' };
  if (invite.expiresAt < new Date()) return { ok: false, reason: 'expired' };

  const passwordHash = await bcrypt.hash(input.password, 10);
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: invite.email },
      update: { name: input.name, passwordHash },
      create: { email: invite.email, name: input.name, passwordHash },
    });
    await tx.membership.upsert({
      where: { userId_restaurantId: { userId: user.id, restaurantId: invite.restaurantId } },
      update: { role: invite.role },
      create: { userId: user.id, restaurantId: invite.restaurantId, role: invite.role },
    });
    await tx.staffInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  });

  return { ok: true, restaurantSlug: invite.restaurant.slug };
}

// ─────────────────────── Member management ───────────────────────

export type MemberMutationResult = { ok: true } | { ok: false; reason: 'last_owner' | 'not_found' };

function ownerCount(db: PrismaClient, restaurantId: number): Promise<number> {
  return db.membership.count({ where: { restaurantId, role: 'OWNER' } });
}

/** Remove a member — refuses to remove the last OWNER (would orphan the restaurant). */
export async function removeMember(
  db: PrismaClient,
  restaurantId: number,
  userId: string,
): Promise<MemberMutationResult> {
  const m = await db.membership.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (!m) return { ok: false, reason: 'not_found' };
  if (m.role === 'OWNER' && (await ownerCount(db, restaurantId)) <= 1) {
    return { ok: false, reason: 'last_owner' };
  }
  await db.membership.delete({ where: { userId_restaurantId: { userId, restaurantId } } });
  return { ok: true };
}

/** Change a member's role — refuses to demote the last OWNER. */
export async function changeMemberRole(
  db: PrismaClient,
  restaurantId: number,
  userId: string,
  role: Role,
): Promise<MemberMutationResult> {
  const m = await db.membership.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  if (!m) return { ok: false, reason: 'not_found' };
  if (m.role === 'OWNER' && role !== 'OWNER' && (await ownerCount(db, restaurantId)) <= 1) {
    return { ok: false, reason: 'last_owner' };
  }
  await db.membership.update({
    where: { userId_restaurantId: { userId, restaurantId } },
    data: { role },
  });
  return { ok: true };
}

/** Revoke a still-pending invite. Tenant-scoped; already-accepted invites are untouched. */
export function revokeInvite(db: PrismaClient, restaurantId: number, inviteId: string) {
  return db.staffInvite.deleteMany({ where: { id: inviteId, restaurantId, acceptedAt: null } });
}
