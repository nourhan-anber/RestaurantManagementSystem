import type { PrismaClient } from '@/generated/prisma/client';
import type { SubscriptionStatus } from '@/generated/prisma/enums';

export interface SubscriptionUpsert {
  restaurantId: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: SubscriptionStatus;
  priceId?: string | null;
  currentPeriodEnd?: Date | null;
}

/** Idempotently apply a subscription state (called from the Stripe webhook). */
export async function applySubscription(db: PrismaClient, data: SubscriptionUpsert) {
  return db.subscription.upsert({
    where: { restaurantId: data.restaurantId },
    update: {
      stripeCustomerId: data.stripeCustomerId ?? undefined,
      stripeSubscriptionId: data.stripeSubscriptionId ?? undefined,
      status: data.status,
      priceId: data.priceId ?? undefined,
      currentPeriodEnd: data.currentPeriodEnd ?? undefined,
    },
    create: {
      restaurantId: data.restaurantId,
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      status: data.status,
      priceId: data.priceId ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
    },
  });
}

export function getSubscription(db: PrismaClient, restaurantId: number) {
  return db.subscription.findUnique({ where: { restaurantId } });
}
