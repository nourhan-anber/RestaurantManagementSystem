import bcrypt from 'bcryptjs';
import type { Role } from '@/generated/prisma/enums';

/** Compact membership carried in the session/JWT so authz avoids a DB round-trip. */
export interface SessionMembership {
  restaurantId: number;
  restaurantSlug: string;
  role: Role;
}

/** Verify a plaintext password against a bcrypt hash. Missing hash never matches. */
export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/** Map Prisma membership rows to the compact session shape. */
export function toSessionMemberships(
  memberships: Array<{ restaurantId: number; role: Role; restaurant: { slug: string } }>,
): SessionMembership[] {
  return memberships.map((m) => ({
    restaurantId: m.restaurantId,
    restaurantSlug: m.restaurant.slug,
    role: m.role,
  }));
}

/** Landing route after a successful login, chosen by platform role then membership role.
 *  Owner/manager land on the tenant overview; chef goes to the kitchen; server to the floor. */
export function resolvePostLoginPath(user: {
  isPlatformAdmin: boolean;
  memberships: SessionMembership[];
}): string {
  if (user.isPlatformAdmin) return '/admin';

  const first = user.memberships[0];
  if (!first) return '/no-access';

  const base = `/r/${first.restaurantSlug}`;
  if (first.role === 'CHEF') return `${base}/kitchen`;
  if (first.role === 'SERVER') return `${base}/floor`;
  return base; // OWNER / MANAGER → overview
}
