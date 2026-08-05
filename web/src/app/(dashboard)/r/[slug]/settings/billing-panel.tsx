'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { isSubscriptionActive, subscriptionLabel } from '@/lib/subscription';
import { startCheckout, type CheckoutState } from '@/server/actions/billing';
import type { SubscriptionStatus } from '@/generated/prisma/enums';

const INITIAL: CheckoutState = {};

export function BillingPanel({
  slug,
  status,
  configured,
  renewsOn,
}: {
  slug: string;
  status: SubscriptionStatus | null;
  configured: boolean;
  renewsOn: string | null;
}) {
  const [state, formAction, pending] = useActionState(startCheckout.bind(null, slug), INITIAL);
  const active = isSubscriptionActive(status);

  return (
    <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground">Billing</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            active ? 'bg-pine/10 text-pine dark:bg-linen/10 dark:text-linen' : 'bg-clay/40 text-muted'
          }`}
        >
          {subscriptionLabel(status)}
        </span>
      </div>

      {status === 'TRIALING' ? (
        <p className="mt-2 text-sm text-muted">
          Free trial{renewsOn ? ` — first charge on ${renewsOn}` : ''}.
        </p>
      ) : active && renewsOn ? (
        <p className="mt-2 text-sm text-muted">Renews on {renewsOn}.</p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Subscribe to keep your restaurant active on Mise — includes a 7-day free trial.
        </p>
      )}

      {!configured ? (
        <p className="mt-3 rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-xs text-muted">
          Billing isn&rsquo;t configured on this deployment yet — set{' '}
          <span className="font-mono">STRIPE_SECRET_KEY</span> and{' '}
          <span className="font-mono">STRIPE_PRICE_ID</span> to enable checkout.
        </p>
      ) : null}

      {state.error ? <p role="alert" className="mt-3 text-sm text-ember-600">{state.error}</p> : null}

      <form action={formAction} className="mt-4">
        <Button type="submit" disabled={pending || !configured}>
          {pending ? 'Redirecting…' : active ? 'Manage subscription' : 'Subscribe'}
        </Button>
      </form>
    </section>
  );
}
