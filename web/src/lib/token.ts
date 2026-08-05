import { createHash, randomBytes } from 'node:crypto';

/** A URL-safe random token for password-reset / verification links. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** The deterministic hash we persist — never the raw token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A Date `minutes` after `now` (token expiry). */
export function expiryFromNow(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60_000);
}

/** Whether a token with the given expiry is expired at `now` (expiry is exclusive). */
export function isExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}
