import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import {
  refundsTotal,
  revenueRows,
  salesByPaymentMethod,
  salesByType,
  salesSummary,
  tipsTotal,
  topCustomers,
  topItemsAndCategories,
} from '@/server/services/reports';
import { bucketRevenueByDay, percentOfMax, type RankRow } from '@/lib/reports';
import { localDayLabel } from '@/lib/datetime';
import { parseDateRange } from '@/lib/pagination';
import { formatMoney } from '@/lib/format';
import { Button, buttonClasses } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TYPE_LABEL: Record<string, string> = { DINE_IN: 'Dine-in', PICKUP: 'Pickup', DELIVERY: 'Delivery' };
const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', CARD: 'Card', ONLINE: 'Online', OTHER: 'Other' };

function dayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { slug } = await params;
  const { from, to } = await searchParams;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  // Default to the last 30 days when no range is given.
  const now = new Date();
  const fromStr = from ?? dayString(new Date(now.getTime() - 30 * 86_400_000));
  const toStr = to ?? dayString(now);
  const range = parseDateRange(fromStr, toStr);

  const [summary, rows, byType, byMethod, top, customers, refunds, tips] = await Promise.all([
    salesSummary(db, restaurant.id, range),
    revenueRows(db, restaurant.id, range),
    salesByType(db, restaurant.id, range),
    salesByPaymentMethod(db, restaurant.id, range),
    topItemsAndCategories(db, restaurant.id, range),
    topCustomers(db, restaurant.id, range),
    refundsTotal(db, restaurant.id, range),
    tipsTotal(db, restaurant.id, range),
  ]);

  const byDay = bucketRevenueByDay(rows, restaurant.timezone);
  const maxDayTotal = byDay.reduce((m, d) => Math.max(m, d.total), 0);

  const tiles = [
    { label: 'Net revenue', value: formatMoney(summary.revenue) },
    { label: 'Tax collected', value: formatMoney(summary.taxCollected) },
    { label: 'Orders', value: String(summary.orders) },
    { label: 'Avg order', value: formatMoney(summary.avgOrder) },
    { label: 'Items sold', value: String(summary.itemsSold) },
    ...(tips > 0 ? [{ label: 'Tips collected', value: formatMoney(tips) }] : []),
    ...(refunds > 0 ? [{ label: 'Refunds', value: formatMoney(refunds) }] : []),
  ];

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Reports</h1>
      <p className="mt-1 text-sm text-muted">Settled (delivered) orders, {fromStr} → {toStr}.</p>

      <form className="mt-6 flex flex-wrap items-end gap-3" action={`/r/${slug}/reports`}>
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={fromStr} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={toStr} className="w-40" />
        </div>
        <Button type="submit" variant="secondary">Apply</Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="self-center text-xs uppercase tracking-wide text-muted">Export CSV:</span>
        <a href={`/r/${slug}/reports/export?type=summary&from=${fromStr}&to=${toStr}`} className={buttonClasses({ size: 'sm', variant: 'ghost' })}>
          Summary
        </a>
        <a href={`/r/${slug}/reports/export?type=orders&from=${fromStr}&to=${toStr}`} className={buttonClasses({ size: 'sm', variant: 'ghost' })}>
          Orders
        </a>
        <a href={`/r/${slug}/reports/export?type=customers`} className={buttonClasses({ size: 'sm', variant: 'ghost' })}>
          Customers
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-[var(--radius)] border border-border bg-surface p-5">
            <p className="font-display text-2xl tabular-nums text-foreground">{t.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue over time */}
      <Section title="Revenue over time">
        {byDay.length === 0 ? (
          <p className="text-sm text-muted">No sales in this range.</p>
        ) : (
          <ul className="space-y-1.5">
            {byDay.map((d) => (
              <li key={d.day} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-muted">{localDayLabel(d.day)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-clay/30">
                  <span className="block h-full rounded-full bg-ember" style={{ width: `${percentOfMax(d.total, maxDayTotal)}%` }} />
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums text-foreground">{formatMoney(d.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* By order type */}
        <Section title="By order type">
          <BreakdownTable
            head={['Type', 'Orders', 'Revenue']}
            rows={byType.map((t) => [TYPE_LABEL[t.orderType] ?? t.orderType, String(t.orders), formatMoney(t.revenue)])}
            empty="No sales."
          />
        </Section>

        {/* By payment method (net of refunds) */}
        <Section title="Payments collected">
          <BreakdownTable
            head={['Method', 'Count', 'Net']}
            rows={byMethod.map((m) => [METHOD_LABEL[m.method] ?? m.method, String(m.count), formatMoney(m.net)])}
            empty="No payments recorded."
          />
        </Section>

        {/* Top items */}
        <Section title="Top items">
          <RankBars rows={top.items} />
        </Section>

        {/* Top categories */}
        <Section title="Top categories">
          <RankBars rows={top.categories} />
        </Section>
      </div>

      {/* Top customers */}
      <Section title="Top customers">
        {customers.length === 0 ? (
          <p className="text-sm text-muted">No customer orders in this range.</p>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
            <ul className="divide-y divide-border">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/r/${slug}/customers/${c.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <span className="text-foreground">{c.name ?? c.phone ?? 'Customer'}</span>
                    <span className="flex gap-4 text-muted">
                      <span className="tabular-nums">{c.orders} order{c.orders === 1 ? '' : 's'}</span>
                      <span className="w-20 text-right tabular-nums text-foreground">{formatMoney(c.spend)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

function BreakdownTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 font-medium">{head[0]}</th>
            <th className="px-4 py-2.5 text-right font-medium">{head[1]}</th>
            <th className="px-4 py-2.5 text-right font-medium">{head[2]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r[0]}>
              <td className="px-4 py-2.5 text-foreground">{r[0]}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted">{r[1]}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankBars({ rows }: { rows: RankRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No sales.</p>;
  const max = rows.reduce((m, r) => Math.max(m, r.revenue), 0);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="flex justify-between">
            <span className="text-foreground">{r.name}</span>
            <span className="tabular-nums text-muted">
              {formatMoney(r.revenue)} · {r.quantity} sold
            </span>
          </div>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-clay/30">
            <span className="block h-full rounded-full bg-pine dark:bg-linen" style={{ width: `${percentOfMax(r.revenue, max)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
