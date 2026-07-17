'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DAY_LABELS, minutesToHhmm } from '@/lib/hours';
import { CA_TAX_PRESETS, CUSTOM_TAX } from '@/lib/tax';
import { STOREFRONT_TEMPLATES } from '@/lib/storefront';
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
  ordersPaused: boolean;
  taxEnabled: boolean;
  taxRatePercent: number;
  taxLabel: string;
  taxRegion: string | null;
  storefrontTemplate: string;
  themeColor: string;
}

const INITIAL: BrandingState = {};
const textareaClass =
  'w-full rounded-[var(--radius)] border border-border bg-surface px-3.5 py-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30';
const selectClass =
  'h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30';

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
        <label className="flex items-start gap-2 rounded-[var(--radius)] border border-ember/40 bg-ember/5 px-3 py-2.5 text-sm text-foreground">
          <input type="checkbox" name="ordersPaused" defaultChecked={restaurant.ordersPaused} className="mt-0.5 size-4 accent-[var(--color-ember)]" />
          <span>
            <span className="font-medium">Pause new orders (we&rsquo;re busy)</span>
            <span className="mt-0.5 block text-xs text-muted">
              Temporarily stop accepting online orders — the storefront stays visible but checkout is
              blocked. Turn off when you&rsquo;re ready again.
            </span>
          </span>
        </label>
        <p className="text-xs text-muted">
          Storefront:{' '}
          <Link href={`/order/${slug}`} className="font-mono text-ember-600 hover:underline">
            /order/{slug}
          </Link>
        </p>
      </section>

      <section className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5">
        <div>
          <h2 className="font-display text-lg text-foreground">Storefront look</h2>
          <p className="mt-1 text-xs text-muted">How your public order page is styled.</p>
        </div>
        <div>
          <Label>Template</Label>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {STOREFRONT_TEMPLATES.map((t) => (
              <label
                key={t.id}
                className="cursor-pointer rounded-[var(--radius)] border border-border p-3 text-center transition-colors has-[:checked]:border-ember has-[:checked]:bg-ember/5"
              >
                <input
                  type="radio"
                  name="storefrontTemplate"
                  value={t.id}
                  defaultChecked={restaurant.storefrontTemplate === t.id}
                  className="sr-only"
                />
                <TemplateThumb id={t.id} />
                <span className="mt-2 block text-sm font-medium text-foreground">{t.label}</span>
                <span className="mt-0.5 block text-[0.7rem] leading-tight text-muted">{t.description}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="themeColor">Accent color</Label>
          <div className="flex items-center gap-3">
            <input
              id="themeColor"
              name="themeColor"
              type="color"
              defaultValue={restaurant.themeColor}
              className="h-10 w-16 cursor-pointer rounded-[var(--radius)] border border-border bg-surface"
            />
            <span className="text-xs text-muted">Buttons, badges, and highlights on your storefront.</span>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5">
        <div>
          <h2 className="font-display text-lg text-foreground">Taxes</h2>
          <p className="mt-1 text-xs text-muted">Sales tax added on top of item prices at checkout.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="taxEnabled" defaultChecked={restaurant.taxEnabled} className="size-4 accent-[var(--color-ember)]" />
          Charge sales tax
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="taxRegion">Region</Label>
          <select id="taxRegion" name="taxRegion" defaultValue={restaurant.taxRegion ?? CUSTOM_TAX} className={selectClass}>
            {CA_TAX_PRESETS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.region} — {p.label} {p.ratePercent}%
              </option>
            ))}
            <option value={CUSTOM_TAX}>Custom rate…</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="taxRatePercent">Custom rate (%)</Label>
            <Input id="taxRatePercent" name="taxRatePercent" type="number" step="0.001" min="0" defaultValue={restaurant.taxRatePercent} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxLabel">Custom label</Label>
            <Input id="taxLabel" name="taxLabel" defaultValue={restaurant.taxLabel} placeholder="e.g. GST" />
          </div>
        </div>
        <p className="text-xs text-muted">Pick a province, or choose <span className="font-medium">Custom rate…</span> to use the rate &amp; label above.</p>
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

/** A tiny schematic of each storefront template for the picker. */
function TemplateThumb({ id }: { id: string }) {
  const line = <span className="block h-1 rounded bg-muted/40" />;
  return (
    <div className="mx-auto h-14 w-full max-w-[5rem] overflow-hidden rounded border border-border bg-background p-1.5">
      {id === 'banner' ? (
        <span className="mb-1 block h-3 rounded bg-ember" />
      ) : id === 'hero' ? (
        <span className="mx-auto mb-1 block size-3 rounded-full bg-ember" />
      ) : (
        <span className="mb-1 flex items-center gap-1">
          <span className="size-2 rounded-full bg-ember" />
          <span className="h-1.5 w-6 rounded bg-muted/40" />
        </span>
      )}
      <div className="space-y-1">
        {line}
        {line}
      </div>
    </div>
  );
}
