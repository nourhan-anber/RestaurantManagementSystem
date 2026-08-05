'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { startCheckout, type CheckoutState } from '@/server/actions/billing';

const INITIAL: CheckoutState = {};

export function Paywall({ slug, role }: { slug: string; role: string }) {
  const [state, formAction, pending] = useActionState(startCheckout.bind(null, slug), INITIAL);
  const isOwner = role === 'OWNER';

  return (
    <div className="mx-auto mt-10 max-w-md rounded-[var(--radius)] border border-border bg-surface p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-ember/10 text-2xl">🔒</div>
      <h1 className="mt-4 font-display text-2xl text-foreground">Subscription required</h1>
      <p className="mt-2 text-sm text-muted">
        Your subscription is inactive. Subscribe to keep taking orders and managing your restaurant.
        New subscriptions include a 7-day free trial.
      </p>

      {isOwner ? (
        <form action={formAction} className="mt-6">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Redirecting…' : 'Subscribe'}
          </Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">Ask your restaurant owner to subscribe.</p>
      )}

      {state.error ? <p role="alert" className="mt-3 text-sm text-ember-600">{state.error}</p> : null}
    </div>
  );
}
