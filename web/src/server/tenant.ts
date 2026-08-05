import type { Role } from '@/generated/prisma/enums';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { authorizeAbility, findMembership, type Action } from '@/server/authz';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/server/errors';
import { isBillingConfigured } from '@/server/stripe';
import { hasDashboardAccess } from '@/lib/subscription';

// Operational writes are blocked when the subscription lapses (paywall). Billing
// (settings:write) and reads stay open so the owner can always subscribe.
const SUBSCRIPTION_GATED: readonly Action[] = [
  'menu:write',
  'table:write',
  'order:advance',
  'staff:manage',
];

export interface TenantContext {
  restaurantId: number;
  restaurantSlug: string;
  restaurantName: string;
  role: Role;
  userId: string;
}

/**
 * Authoritative gate for tenant mutations (server actions / route handlers):
 * confirms the session may perform `action` on `slug`, then resolves the tenant.
 * Throws UnauthorizedError / ForbiddenError / NotFoundError — never returns a
 * context the caller isn't allowed to act on.
 */
export async function requireAbility(slug: string, action: Action): Promise<TenantContext> {
  const session = await auth();
  const result = authorizeAbility(session, slug, action);
  if (!result.ok) {
    throw result.reason === 'unauthenticated' ? new UnauthorizedError() : new ForbiddenError();
  }

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw new NotFoundError();

  // Paywall operational writes when the subscription has lapsed (only when billing
  // is actually configured, so dev/tests without Stripe are never locked out).
  if (isBillingConfigured() && SUBSCRIPTION_GATED.includes(action)) {
    const sub = await db.subscription.findUnique({
      where: { restaurantId: restaurant.id },
      select: { status: true },
    });
    if (!hasDashboardAccess(sub?.status ?? null, true)) throw new ForbiddenError();
  }

  return {
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    restaurantName: restaurant.name,
    role: result.membership.role,
    userId: session!.user.id,
  };
}

/** Any member of the tenant (no specific ability). For read-only tenant pages. */
export async function requireTenant(slug: string): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();

  const membership = findMembership(session.user.memberships, slug);
  if (!membership) throw new ForbiddenError();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw new NotFoundError();

  return {
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
    restaurantName: restaurant.name,
    role: membership.role,
    userId: session.user.id,
  };
}

/** Cross-tenant platform operator (create restaurants, onboard owners). */
export async function requirePlatformAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  if (!session.user.isPlatformAdmin) throw new ForbiddenError();
  return { userId: session.user.id };
}
