'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitPasswordReset, type ResetState } from '@/server/actions/account';

const INITIAL: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(submitPasswordReset.bind(null, token), INITIAL);

  if (state.ok) {
    return (
      <div className="space-y-4">
        <p className="rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm text-muted">
          Your password has been reset.
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-ember-600">
          Go to sign in →
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required placeholder="At least 8 characters" />
      </div>
      {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  );
}
