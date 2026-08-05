import type { Role } from '@/generated/prisma/enums';
import type { SessionMembership } from '@/server/auth-helpers';

/** Fine-grained abilities checked at every mutation. */
export type Action =
  | 'menu:write'
  | 'table:write'
  | 'order:advance'
  | 'staff:manage'
  | 'reports:view'
  | 'payment:refund'
  | 'settings:write';

/** Role → allowed abilities. Owner is the superset; manager loses billing/settings;
 *  chef works the pass; server works the floor. */
const MATRIX: Record<Role, readonly Action[]> = {
  OWNER: ['menu:write', 'table:write', 'order:advance', 'staff:manage', 'reports:view', 'payment:refund', 'settings:write'],
  MANAGER: ['menu:write', 'table:write', 'order:advance', 'staff:manage', 'reports:view', 'payment:refund'],
  CHEF: ['order:advance'],
  SERVER: ['order:advance', 'table:write'],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}

export function findMembership(
  memberships: readonly SessionMembership[],
  slug: string,
): SessionMembership | undefined {
  return memberships.find((m) => m.restaurantSlug === slug);
}

export type AuthzFailure = 'unauthenticated' | 'forbidden';

export type AuthzResult =
  | { ok: true; membership: SessionMembership }
  | { ok: false; reason: AuthzFailure };

/** Pure authorization decision: is this session allowed to perform `action` on `slug`? */
export function authorizeAbility(
  session: { user?: { memberships?: readonly SessionMembership[] } } | null | undefined,
  slug: string,
  action: Action,
): AuthzResult {
  if (!session?.user) return { ok: false, reason: 'unauthenticated' };

  const membership = findMembership(session.user.memberships ?? [], slug);
  if (!membership) return { ok: false, reason: 'forbidden' };
  if (!can(membership.role, action)) return { ok: false, reason: 'forbidden' };

  return { ok: true, membership };
}
