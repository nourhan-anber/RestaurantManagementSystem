'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DAY_LABELS, minutesToHhmm } from '@/lib/hours';
import { updateBranding, type BrandingState } from '@/server/actions/restaurants';
import { ImageUploadField } from '../menu/image-upload-field';

export interface BrandingHoursRow {
  dayOfWeek: number;
  opensMinutes: number;
  closesMinutes: number;
  isClosed: boolean;
}
export interface BrandingData {
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  logoUrl: string | null;
  onlineOrderingEnabled: boolean;
}

const INITIAL: BrandingState = {};
const textareaClass =
  'w-full rounded-[var(--radius)] border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30';

export function BrandingForm({
  slug,
  restaurant,
  hours,
  uploadConfigured,
}: {
  slug: string;
  restaurant: BrandingData;
  hours: BrandingHoursRow[];
  uploadConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateBranding.bind(null, slug), INITIAL);
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <section className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg text-foreground">Profile & branding</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={restaurant.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea id="description" name="description" rows={2} defaultValue={restaurant.description ?? ''} className={textareaClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={restaurant.phone ?? ''} placeholder="+1 555 123 4567" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" name="timezone" required defaultValue={restaurant.timezone} placeholder="America/New_York" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address (also the delivery pickup point)</Label>
          <Input id="address" name="address" defaultValue={restaurant.address ?? ''} placeholder="123 Main St, City" />
        </div>
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <ImageUploadField slug={slug} defaultUrl={restaurant.logoUrl ?? ''} configured={uploadConfigured} kind="branding" name="logoUrl" />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="onlineOrderingEnabled" defaultChecked={restaurant.onlineOrderingEnabled} className="size-4 accent-[var(--color-ember)]" />
          Online ordering enabled
        </label>
        <p className="text-xs text-muted">
          Storefront:{' '}
          <Link href={`/order/${slug}`} className="font-mono text-ember-600 hover:underline">
            /order/{slug}
          </Link>
        </p>
      </section>

      <section className="space-y-3 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg text-foreground">Opening hours</h2>
        {DAY_LABELS.map((label, day) => {
          const h = byDay.get(day);
          return (
            <div key={day} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-24 text-foreground">{label}</span>
              <label className="flex items-center gap-1.5 text-muted">
                <input type="checkbox" name={`day_${day}_closed`} defaultChecked={h?.isClosed ?? false} className="size-4 accent-[var(--color-ember)]" />
                Closed
              </label>
              <Input type="time" name={`day_${day}_open`} defaultValue={minutesToHhmm(h?.opensMinutes ?? 660)} className="w-32" />
              <span className="text-muted">to</span>
              <Input type="time" name={`day_${day}_close`} defaultValue={minutesToHhmm(h?.closesMinutes ?? 1320)} className="w-32" />
            </div>
          );
        })}
      </section>

      {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-pine dark:text-linen">Saved.</p> : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
