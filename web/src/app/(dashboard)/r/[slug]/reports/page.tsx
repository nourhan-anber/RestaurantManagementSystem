import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { salesSummary, topItems } from '@/server/services/reports';
import { formatMoney } from '@/lib/format';
import { percentOfMax } from '@/lib/reports';

export default async function ReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const [summary, top] = await Promise.all([
    salesSummary(db, restaurant.id),
    topItems(db, restaurant.id),
  ]);
  const maxQty = top[0]?.quantity ?? 0;

  const tiles = [
    { label: 'Revenue', value: formatMoney(summary.revenue) },
    { label: 'Orders', value: String(summary.orders) },
    { label: 'Avg order', value: formatMoney(summary.avgOrder) },
    { label: 'Items sold', value: String(summary.itemsSold) },
  ];

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Reports</h1>
      <p className="mt-1 text-sm text-muted">Based on settled (delivered) orders.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[var(--radius)] border border-border bg-surface p-5">
            <p className="font-display text-2xl tabular-nums text-foreground">{t.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg text-foreground">Top items</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No sales yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {top.map((item) => (
              <li key={item.name} className="rounded-[var(--radius)] border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="tabular-nums text-muted">{item.quantity} sold</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-clay/40">
                  <div
                    className="h-full rounded-full bg-ember"
                    style={{ width: `${percentOfMax(item.quantity, maxQty)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
