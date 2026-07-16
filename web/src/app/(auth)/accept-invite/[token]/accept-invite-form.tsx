'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitAcceptInvite, type AcceptState } from '@/server/actions/staff';

const INITIAL: AcceptState = {};

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(submitAcceptInvite.bind(null, token), INITIAL);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" defaultValue={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required placeholder="Sam Rossi" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Create a password</Label>
        <Input id="password" name="password" type="password" required placeholder="At least 8 characters" />
      </div>

      {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Setting up…' : 'Join the team'}
      </Button>
    </form>
  );
}
