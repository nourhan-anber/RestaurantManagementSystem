import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@/generated/prisma/client';
import { verifyPassword } from '@/server/auth-helpers';
import { expiryFromNow, generateToken, hashToken, isExpired } from '@/lib/token';

const RESET_TTL_MINUTES = 60;

/**
 * Issue a password-reset token for the account with this email, if one exists.
 * Returns the raw token (for the emailed link) and userId, or null when there's no
 * such user — callers respond identically either way to avoid user enumeration.
 */
export async function createPasswordReset(
  db: PrismaClient,
  email: string,
  now: Date,
): Promise<{ token: string; userId: string } | null> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
  if (!user) return null;
  const token = generateToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: expiryFromNow(now, RESET_TTL_MINUTES) },
  });
  return { token, userId: user.id };
}

export type ResetResult = { ok: true } | { ok: false; reason: 'invalid' | 'expired' | 'used' };

/**
 * Consume a reset token and set a new password (single-use). Marks every outstanding
 * token for that user as used so a leaked link can't be replayed.
 */
export async function resetPassword(
  db: PrismaClient,
  token: string,
  newPassword: string,
  now: Date,
): Promise<ResetResult> {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.usedAt) return { ok: false, reason: 'used' };
  if (isExpired(row.expiresAt, now)) return { ok: false, reason: 'expired' };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: now } }),
  ]);
  return { ok: true };
}

/** Update the signed-in user's display name. */
export async function updateName(db: PrismaClient, userId: string, name: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { name: name.trim() } });
}

export type ChangePasswordResult = { ok: true } | { ok: false; reason: 'not_found' | 'wrong_password' };

/** Change the signed-in user's password after re-verifying the current one. */
export async function changePassword(
  db: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return { ok: false, reason: 'not_found' };
  if (!(await verifyPassword(currentPassword, user.passwordHash))) return { ok: false, reason: 'wrong_password' };
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  return { ok: true };
}
