import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth, signOut } from '@/server/auth';
import { db } from '@/server/db';
import { findMembership } from '@/server/authz';
import { isBillingConfigured } from '@/server/stripe';
import { hasDashboardAccess } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Paywall } from './paywall';

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/r/${slug}`);

  const membership = findMembership(session.user.memberships, slug);
  if (!membership) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const subscription = await db.subscription.findUnique({
    where: { restaurantId: restaurant.id },
    select: { status: true },
  });
  const access = hasDashboardAccess(subscription?.status ?? null, isBillingConfigured());

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-semibold text-foreground">
            {restaurant.name}
          </span>
          <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-pine dark:bg-linen/10 dark:text-linen">
            {membership.role.toLowerCase()}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted sm:inline">{session.user.email}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {access ? children : <Paywall slug={slug} role={membership.role} />}
      </main>
    </div>
  );
}
