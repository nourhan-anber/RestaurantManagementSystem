import type { SubscriptionStatus } from '@/generated/prisma/enums';

/** Map a Stripe subscription status string to our enum. */
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELED';
    default:
      return 'INACTIVE';
  }
}

/** A subscription in good standing (trial or paid). */
export function isSubscriptionActive(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'ACTIVE' || status === 'TRIALING';
}

/** Whether the tenant may perform write operations under this subscription.
 *  Past-due keeps write access (grace period); canceled/inactive is read-only. */
export function subscriptionAllowsWrite(status: SubscriptionStatus | null | undefined): boolean {
  return isSubscriptionActive(status) || status === 'PAST_DUE';
}

/**
 * Whether the tenant may use the dashboard. Enforcement is a no-op unless billing
 * is configured (so dev/tests without Stripe stay fully open); when configured,
 * access requires a subscription in good standing (active, trialing, or past-due
 * grace). A canceled/inactive/absent subscription is paywalled.
 */
export function hasDashboardAccess(
  status: SubscriptionStatus | null | undefined,
  billingConfigured: boolean,
): boolean {
  return !billingConfigured || subscriptionAllowsWrite(status);
}

export function subscriptionLabel(status: SubscriptionStatus | null | undefined): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'TRIALING':
      return 'Trialing';
    case 'PAST_DUE':
      return 'Past due';
    case 'CANCELED':
      return 'Canceled';
    default:
      return 'Not subscribed';
  }
}
