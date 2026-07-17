'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changeUserPassword, updateProfile, type ProfileState } from '@/server/actions/account';

const INITIAL: ProfileState = {};

export function ProfileNameForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" defaultValue={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-pine">Saved.</p> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeUserPassword, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required placeholder="At least 8 characters" />
      </div>
      {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-pine">Password updated.</p> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Updating…' : 'Update password'}</Button>
    </form>
  );
}
