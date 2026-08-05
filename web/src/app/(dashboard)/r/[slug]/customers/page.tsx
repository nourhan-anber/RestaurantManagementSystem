import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listCustomers } from '@/server/services/customers';
import { pageInfo, parsePage } from '@/lib/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pager } from '../pager';

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { q, page: pageParam } = await searchParams;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const { page, pageSize, skip, take } = parsePage(pageParam);
  const { rows, total } = await listCustomers(db, restaurant.id, { search: q, skip, take });
  const info = pageInfo(total, page, pageSize);

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Customers</h1>
      <p className="mt-1 text-sm text-muted">Built automatically from phone and email on orders.</p>

      <form className="mt-6 flex gap-2" action={`/r/${slug}/customers`}>
        <Input name="q" defaultValue={q ?? ''} placeholder="Search name, phone, or email" className="max-w-sm" />
        <Button type="submit" variant="secondary">Search</Button>
        {q ? (
          <Link href={`/r/${slug}/customers`} className="self-center text-sm text-muted hover:text-foreground">
            Clear
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {q ? 'No customers match your search.' : 'No customers yet. They appear here after their first order.'}
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          <div className="hidden border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-muted sm:grid sm:grid-cols-[1.5fr_1.2fr_1.5fr_auto_auto] sm:gap-4">
            <span>Name</span>
            <span>Phone</span>
            <span>Email</span>
            <span className="text-right">Orders</span>
            <span className="text-right">Last order</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/r/${slug}/customers/${c.id}`}
                  className="grid gap-1 px-4 py-3 transition-colors hover:bg-black/5 sm:grid-cols-[1.5fr_1.2fr_1.5fr_auto_auto] sm:items-center sm:gap-4 dark:hover:bg-white/5"
                >
                  <span className="font-medium text-foreground">{c.name ?? <span className="text-muted">—</span>}</span>
                  <span className="tabular-nums text-muted">{c.phone ?? '—'}</span>
                  <span className="truncate text-muted">{c.email ?? '—'}</span>
                  <span className="text-muted sm:text-right">
                    <span className="sm:hidden">Orders: </span>
                    <span className="tabular-nums text-foreground">{c.orders}</span>
                  </span>
                  <span className="tabular-nums text-muted sm:text-right">
                    {c.lastOrderAt ? c.lastOrderAt.toLocaleDateString('en-US') : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Pager basePath={`/r/${slug}/customers`} params={{ q }} info={info} total={total} />
    </div>
  );
}
