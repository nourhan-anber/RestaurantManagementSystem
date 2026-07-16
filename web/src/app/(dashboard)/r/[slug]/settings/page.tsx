import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { getSubscription } from '@/server/services/billing';
import { isBillingConfigured } from '@/server/stripe';
import { BillingPanel } from './billing-panel';

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'settings:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const sub = await getSubscription(db, restaurant.id);
  const renewsOn =
    sub?.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString('en-US') : null;

  return (
    <div className="max-w-2xl">
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Settings</h1>

      <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg text-foreground">Restaurant</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Name</dt>
            <dd className="text-foreground">{restaurant.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Address</dt>
            <dd className="font-mono text-foreground">/{restaurant.slug}</dd>
          </div>
        </dl>
      </section>

      <BillingPanel
        slug={slug}
        status={sub?.status ?? null}
        configured={isBillingConfigured()}
        renewsOn={renewsOn}
      />
    </div>
  );
}
