import { createHmac, timingSafeEqual } from 'node:crypto';

// Ported from backend/utils/security.js and re-bound to tenant-unique identity:
// the token is HMAC over "r:<restaurantId>:t:<tableId>" (immutable ids), so a
// token for one restaurant's table can't be replayed against another's, and
// renumbering a table can't collide. Fixes the original single-tenant bug.
function secret(): string {
  return process.env.TABLE_SECRET_KEY ?? 'dev-insecure-table-secret-do-not-use';
}

export function generateTableToken(restaurantId: number, tableId: number): string {
  return createHmac('sha256', secret()).update(`r:${restaurantId}:t:${tableId}`).digest('hex');
}

export function verifyTableToken(
  restaurantId: number,
  tableId: number,
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  try {
    const expected = Buffer.from(generateTableToken(restaurantId, tableId), 'hex');
    const provided = Buffer.from(token, 'hex');
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}
