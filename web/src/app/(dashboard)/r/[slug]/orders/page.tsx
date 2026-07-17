import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listOrders } from '@/server/services/orders';
import { pageInfo, parseDateRange, parsePage } from '@/lib/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrderTable } from '../order-table';
import { Pager } from '../pager';

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { from, to, page: pageParam } = await searchParams;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const range = parseDateRange(from, to);
  const { page, pageSize, skip, take } = parsePage(pageParam);
  const { rows, total } = await listOrders(db, restaurant.id, { from: range.gte, to: range.lte, skip, take });
  const info = pageInfo(total, page, pageSize);

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Orders</h1>
      <p className="mt-1 text-sm text-muted">Every order, newest first.</p>

      <form className="mt-6 flex flex-wrap items-end gap-3" action={`/r/${slug}/orders`}>
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from ?? ''} className="w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to ?? ''} className="w-40" />
        </div>
        <Button type="submit" variant="secondary">Filter</Button>
        {from || to ? (
          <Link href={`/r/${slug}/orders`} className="pb-2.5 text-sm text-muted hover:text-foreground">
            Clear
          </Link>
        ) : null}
      </form>

      <OrderTable orders={rows} slug={slug} showCustomer />
      <Pager basePath={`/r/${slug}/orders`} params={{ from, to }} info={info} total={total} />
    </div>
  );
}
