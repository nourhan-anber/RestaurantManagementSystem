'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateLoyalty, type LoyaltyState } from '@/server/actions/restaurants';

const INITIAL: LoyaltyState = {};

export function LoyaltyForm({
  slug,
  config,
}: {
  slug: string;
  config: { loyaltyEnabled: boolean; pointsPerDollar: number; redeemValuePerPoint: number };
}) {
  const [state, formAction, pending] = useActionState(updateLoyalty.bind(null, slug), INITIAL);

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 className="font-display text-lg text-foreground">Loyalty program</h2>
      <p className="mt-1 text-sm text-muted">Reward repeat customers with points on every completed order.</p>

      <form action={formAction} className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="loyaltyEnabled" defaultChecked={config.loyaltyEnabled} />
          <span className="text-foreground">Enable loyalty points</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pointsPerDollar">Points per $1</Label>
            <Input id="pointsPerDollar" name="pointsPerDollar" type="number" min="1" step="1" defaultValue={config.pointsPerDollar} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="redeemValuePerPoint">$ value per point</Label>
            <Input id="redeemValuePerPoint" name="redeemValuePerPoint" type="number" min="0" step="0.001" defaultValue={config.redeemValuePerPoint} />
          </div>
        </div>

        {state.error ? <p className="text-sm text-ember-600">{state.error}</p> : null}
        {state.ok ? <p className="text-sm text-pine">Saved.</p> : null}
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save loyalty settings'}</Button>
      </form>
    </section>
  );
}
