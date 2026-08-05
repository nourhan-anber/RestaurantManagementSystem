'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset, type ForgotState } from '@/server/actions/account';

const INITIAL: ForgotState = {};

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, INITIAL);

  if (state.ok) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm text-muted">
        If an account exists for that email, we&rsquo;ve sent a link to reset your password. Check
        your inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@restaurant.com" />
      </div>
      {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
