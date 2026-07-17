'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addWaitlistAction,
  createReservationAction,
  type ReservationState,
  type WaitlistState,
} from '@/server/actions/reservations';

const R_INITIAL: ReservationState = {};
const W_INITIAL: WaitlistState = {};

export function NewReservationForm({ slug, defaultAt }: { slug: string; defaultAt: string }) {
  const [state, formAction, pending] = useActionState(createReservationAction.bind(null, slug), R_INITIAL);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="r-name">Name</Label>
        <Input id="r-name" name="name" required placeholder="Guest name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-party">Party</Label>
        <Input id="r-party" name="partySize" type="number" min="1" defaultValue="2" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-at">When</Label>
        <Input id="r-at" name="at" type="datetime-local" defaultValue={defaultAt} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="r-phone">Phone</Label>
        <Input id="r-phone" name="phone" placeholder="Optional" />
      </div>
      <div className="col-span-2 flex items-end sm:col-span-4">
        <Button type="submit" disabled={pending}>{pending ? 'Booking…' : 'Book reservation'}</Button>
        {state.error ? <span className="ml-3 self-center text-sm text-ember-600">{state.error}</span> : null}
      </div>
    </form>
  );
}

export function WaitlistForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(addWaitlistAction.bind(null, slug), W_INITIAL);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="w-name">Name</Label>
        <Input id="w-name" name="name" required placeholder="Guest name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="w-party">Party</Label>
        <Input id="w-party" name="partySize" type="number" min="1" defaultValue="2" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="w-quote">Quote (min)</Label>
        <Input id="w-quote" name="quotedMinutes" type="number" min="0" placeholder="e.g. 20" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="w-phone">Phone</Label>
        <Input id="w-phone" name="phone" placeholder="Optional" />
      </div>
      <div className="col-span-2 flex items-end sm:col-span-4">
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Adding…' : 'Add to waitlist'}</Button>
        {state.error ? <span className="ml-3 self-center text-sm text-ember-600">{state.error}</span> : null}
      </div>
    </form>
  );
}
