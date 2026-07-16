'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createRestaurant, type CreateRestaurantState } from '@/server/actions/restaurants';

const INITIAL: CreateRestaurantState = {};

export function CreateRestaurantForm() {
  const [state, formAction, pending] = useActionState(createRestaurant, INITIAL);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Restaurant name</Label>
        <Input id="name" name="name" required placeholder="Bella Vista" />
      </div>

      <fieldset className="space-y-4 rounded-[var(--radius)] border border-border p-4">
        <legend className="px-1 text-sm font-medium text-foreground">Owner account</legend>
        <div className="space-y-2">
          <Label htmlFor="ownerName">Owner name</Label>
          <Input id="ownerName" name="ownerName" required placeholder="Sam Rossi" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerEmail">Owner email</Label>
          <Input id="ownerEmail" name="ownerEmail" type="email" required placeholder="sam@bellavista.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerPassword">Temporary password</Label>
          <Input id="ownerPassword" name="ownerPassword" type="password" required placeholder="At least 8 characters" />
          <p className="text-xs text-muted">Share this with the owner; they can change it later.</p>
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-ember-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Creating…' : 'Create restaurant'}
      </Button>
    </form>
  );
}
