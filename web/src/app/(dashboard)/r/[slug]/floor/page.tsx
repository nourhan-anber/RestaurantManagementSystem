import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listFloor } from '@/server/services/orders';
import { formatMoney } from '@/lib/format';
import { SettleBill } from './settle-modal';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'border-border',
  OCCUPIED: 'border-ember/50',
  CLOSED: 'border-border opacity-60',
};

export default async function FloorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'table:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const tables = await listFloor(db, restaurant.id);

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Floor</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => {
          const activeTotal = t.orders.reduce((sum, o) => sum + Number(o.total), 0);
          return (
            <div
              key={t.id}
              className={`rounded-[var(--radius)] border-2 bg-surface p-4 ${STATUS_STYLES[t.status] ?? 'border-border'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xl text-foreground">Table {t.number}</span>
                <span className="text-[0.65rem] uppercase tracking-wide text-muted">
                  {t.status.toLowerCase()} · {t.capacity} seats
                </span>
              </div>

              {t.orders.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No open orders.</p>
              ) : (
                <ul className="mt-3 space-y-1 text-sm text-foreground">
                  {t.orders.map((o) => (
                    <li key={o.id} className="flex justify-between">
                      <span>
                        {o.guestName ? <span className="text-foreground">{o.guestName} · </span> : null}
                        {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
                        <span className="text-muted">{o.status.toLowerCase()}</span>
                      </span>
                      <span className="tabular-nums">{formatMoney(Number(o.total))}</span>
                    </li>
                  ))}
                </ul>
              )}

              {t.orders.length > 0 ? (
                <SettleBill slug={slug} tableId={t.id} amount={activeTotal} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
