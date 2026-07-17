import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { salesSummary } from '@/server/services/reports';
import { dashboardStats } from '@/server/services/dashboard';
import { RESTAURANT_SECTIONS, sectionHref, visibleSections } from '@/lib/nav';
import { localDayKey } from '@/lib/datetime';
import { parseDateRange } from '@/lib/pagination';
import { formatMoney } from '@/lib/format';
import { SectionCard } from '@/components/dashboard/section-card';

const BUILT_SECTIONS = new Set<string>([
  'menu',
  'tables',
  'staff',
  'kitchen',
  'floor',
  'orders',
  'customers',
  'reports',
  'settings',
]);

const TYPE_LABEL: Record<string, string> = { DINE_IN: 'Dine-in', PICKUP: 'Pickup', DELIVERY: 'Delivery' };

function timeLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function TenantOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const sections = visibleSections(membership.role);
  const hiddenCount = RESTAURANT_SECTIONS.length - sections.length;
  const showSales = can(membership.role, 'reports:view');

  // "Today" in the restaurant's own timezone (aligned to the reports day labels).
  const now = new Date();
  const todayKey = localDayKey(now, restaurant.timezone);
  const todayRange = parseDateRange(todayKey, todayKey);

  const [stats, todaySales] = await Promise.all([
    dashboardStats(db, restaurant.id, now),
    showSales ? salesSummary(db, restaurant.id, todayRange) : Promise.resolve(null),
  ]);

  const tiles = [
    ...(todaySales
      ? [
          { label: "Today's sales", value: formatMoney(todaySales.revenue) },
          { label: 'Orders today', value: String(todaySales.orders) },
        ]
      : []),
    { label: 'Active orders', value: String(stats.activeOrders), href: `/r/${slug}/kitchen` },
    { label: "86'd items", value: String(stats.eightySixCount), href: `/r/${slug}/kitchen` },
  ] as Array<{ label: string; value: string; href?: string }>;

  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight text-foreground">Overview</h1>
      <p className="mt-1 text-sm text-muted">
        You have <span className="font-medium text-foreground">{membership.role.toLowerCase()}</span>{' '}
        access — here&rsquo;s today at a glance.
        {hiddenCount > 0 ? ` ${hiddenCount} more section${hiddenCount > 1 ? 's are' : ' is'} limited to other roles.` : ''}
      </p>

      {/* Live "today" tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <p className="font-display text-2xl tabular-nums text-foreground">{t.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">{t.label}</p>
            </>
          );
          return t.href ? (
            <Link
              key={t.label}
              href={t.href}
              className="rounded-[var(--radius)] border border-border bg-surface p-5 transition-colors hover:border-ember/50"
            >
              {body}
            </Link>
          ) : (
            <div key={t.label} className="rounded-[var(--radius)] border border-border bg-surface p-5">
              {body}
            </div>
          );
        })}
      </div>

      {/* Upcoming scheduled orders */}
      {stats.upcoming.length > 0 ? (
        <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Upcoming scheduled orders</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.upcoming.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3">
                <span className="text-foreground">
                  {o.name ?? 'Guest'} · {TYPE_LABEL[o.orderType] ?? o.orderType}
                </span>
                <span className="tabular-nums text-muted">{timeLabel(o.requestedTime)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <h2 className="mt-10 font-display text-lg tracking-tight text-foreground">Manage</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const built = BUILT_SECTIONS.has(section.key);
          return (
            <SectionCard
              key={section.key}
              label={section.label}
              description={section.description}
              href={built ? sectionHref(slug, section) : undefined}
              comingSoon={!built}
            />
          );
        })}
      </div>
    </div>
  );
}
