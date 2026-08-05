import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { getCustomer } from '@/server/services/customers';
import { listOrders } from '@/server/services/orders';
import { recentLedger } from '@/server/services/loyalty';
import { pageInfo, parsePage } from '@/lib/pagination';
import { OrderTable } from '../../order-table';
import { Pager } from '../../pager';

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; customerId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug, customerId } = await params;
  const { page: pageParam } = await searchParams;
  const id = Number(customerId);

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant || !Number.isInteger(id)) notFound();

  const customer = await getCustomer(db, restaurant.id, id);
  if (!customer) notFound();

  const { page, pageSize, skip, take } = parsePage(pageParam);
  const { rows, total } = await listOrders(db, restaurant.id, { customerId: id, skip, take });
  const info = pageInfo(total, page, pageSize);

  const ledger = restaurant.loyaltyEnabled ? await recentLedger(db, id) : [];

  return (
    <div>
      <Link href={`/r/${slug}/customers`} className="text-sm text-muted hover:text-foreground">
        ← Customers
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">
        {customer.name ?? 'Customer'}
      </h1>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted">
        {customer.phone ? <span>📞 {customer.phone}</span> : null}
        {customer.email ? <span>✉️ {customer.email}</span> : null}
        <span>{total} order{total === 1 ? '' : 's'}</span>
      </p>

      {restaurant.loyaltyEnabled ? (
        <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Loyalty</h2>
            <span className="font-display text-xl tabular-nums text-foreground">
              {customer.points} <span className="text-sm text-muted">points</span>
            </span>
          </div>
          {ledger.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {ledger.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span className="text-muted">{l.reason === 'earn' ? 'Earned' : l.reason}</span>
                  <span className={`tabular-nums ${l.delta >= 0 ? 'text-pine' : 'text-ember-600'}`}>
                    {l.delta >= 0 ? '+' : ''}{l.delta}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">No points activity yet.</p>
          )}
        </section>
      ) : null}

      <h2 className="mt-6 text-xs font-medium uppercase tracking-wide text-muted">Order history</h2>
      <OrderTable orders={rows} slug={slug} />
      <Pager basePath={`/r/${slug}/customers/${id}`} params={{}} info={info} total={total} />
    </div>
  );
}
