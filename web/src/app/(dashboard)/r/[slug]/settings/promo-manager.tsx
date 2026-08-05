'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import { createPromoAction, deletePromoAction, togglePromoAction, type PromoState } from '@/server/actions/promos';

const INITIAL: PromoState = {};

export interface PromoRow {
  id: number;
  code: string;
  kind: 'PERCENT' | 'AMOUNT';
  value: number;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
}

export function PromoManager({ slug, promos }: { slug: string; promos: PromoRow[] }) {
  const [state, formAction, pending] = useActionState(createPromoAction.bind(null, slug), INITIAL);

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 className="font-display text-lg text-foreground">Promo codes</h2>
      <p className="mt-1 text-sm text-muted">Discounts customers can apply at storefront checkout.</p>

      <form action={formAction} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" required placeholder="SAVE10" className="uppercase" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kind">Type</Label>
          <select
            id="kind"
            name="kind"
            defaultValue="PERCENT"
            className="h-9 w-full rounded-[var(--radius)] border border-border bg-background px-2 text-sm text-foreground"
          >
            <option value="PERCENT">% off</option>
            <option value="AMOUNT">$ off</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="value">Value</Label>
          <Input id="value" name="value" type="number" step="0.01" min="0" required placeholder="10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxUses">Max uses</Label>
          <Input id="maxUses" name="maxUses" type="number" min="1" placeholder="∞" />
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label htmlFor="expiresAt">Expires</Label>
          <Input id="expiresAt" name="expiresAt" type="date" />
        </div>
        <div className="col-span-2 flex items-end sm:col-span-1">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Adding…' : 'Add code'}
          </Button>
        </div>
        {state.error ? <p className="col-span-2 text-sm text-ember-600 sm:col-span-4">{state.error}</p> : null}
      </form>

      {promos.length > 0 ? (
        <ul className="mt-5 divide-y divide-border border-t border-border">
          {promos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <span className="font-medium text-foreground">{p.code}</span>
                <span className="ml-2 text-muted">
                  {p.kind === 'PERCENT' ? `${p.value}% off` : `${formatMoney(p.value)} off`}
                  {p.maxUses != null ? ` · ${p.usedCount}/${p.maxUses} used` : ` · ${p.usedCount} used`}
                  {p.expiresAt ? ` · expires ${p.expiresAt}` : ''}
                  {!p.active ? ' · inactive' : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <form action={togglePromoAction.bind(null, slug, p.id, !p.active)}>
                  <Button type="submit" size="sm" variant="ghost">{p.active ? 'Disable' : 'Enable'}</Button>
                </form>
                <form action={deletePromoAction.bind(null, slug, p.id)}>
                  <Button type="submit" size="sm" variant="ghost" className="text-ember-600">Delete</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No promo codes yet.</p>
      )}
    </section>
  );
}
