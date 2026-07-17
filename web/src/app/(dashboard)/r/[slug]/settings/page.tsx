import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { getSubscription } from '@/server/services/billing';
import { getOpeningHours } from '@/server/services/restaurants';
import { isBillingConfigured } from '@/server/stripe';
import { isUploadConfigured } from '@/server/storage';
import { BillingPanel } from './billing-panel';
import { BrandingForm } from './branding-form';

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'settings:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const [sub, hours] = await Promise.all([
    getSubscription(db, restaurant.id),
    getOpeningHours(db, restaurant.id),
  ]);
  const renewsOn =
    sub?.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString('en-US') : null;

  return (
    <div className="max-w-2xl">
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Settings</h1>

      <BrandingForm
        slug={slug}
        restaurant={{
          name: restaurant.name,
          description: restaurant.description,
          phone: restaurant.phone,
          address: restaurant.address,
          timezone: restaurant.timezone,
          logoUrl: restaurant.logoUrl,
          onlineOrderingEnabled: restaurant.onlineOrderingEnabled,
          ordersPaused: restaurant.ordersPaused ?? false,
          taxEnabled: restaurant.taxEnabled ?? false,
          taxRatePercent: Number(restaurant.taxRatePercent ?? 0),
          taxLabel: restaurant.taxLabel ?? 'Tax',
          taxRegion: restaurant.taxRegion ?? null,
          storefrontTemplate: restaurant.storefrontTemplate ?? 'classic',
          themeColor: restaurant.themeColor ?? '#d8622d',
        }}
        hours={hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          opensMinutes: h.opensMinutes,
          closesMinutes: h.closesMinutes,
          isClosed: h.isClosed,
        }))}
        uploadConfigured={isUploadConfigured()}
      />

      <div className="mt-6">
        <BillingPanel
          slug={slug}
          status={sub?.status ?? null}
          configured={isBillingConfigured()}
          renewsOn={renewsOn}
        />
      </div>
    </div>
  );
}
