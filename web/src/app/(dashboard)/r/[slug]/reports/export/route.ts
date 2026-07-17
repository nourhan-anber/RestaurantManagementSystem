import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listOrders } from '@/server/services/orders';
import {
  customerExportRows,
  revenueRows,
  salesByPaymentMethod,
  salesByType,
  salesSummary,
  topCustomers,
  topItemsAndCategories,
} from '@/server/services/reports';
import { bucketRevenueByDay } from '@/lib/reports';
import { customersCsv, ordersCsv, summaryCsv } from '@/lib/export';
import { parseDateRange } from '@/lib/pagination';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'orders';
  const from = url.searchParams.get('from') ?? undefined;
  const to = url.searchParams.get('to') ?? undefined;
  const range = parseDateRange(from, to);

  let csv: string;
  let name: string;

  if (type === 'customers') {
    csv = customersCsv(await customerExportRows(db, restaurant.id));
    name = 'customers';
  } else if (type === 'summary') {
    const [summary, rows, byType, byMethod, top, custs] = await Promise.all([
      salesSummary(db, restaurant.id, range),
      revenueRows(db, restaurant.id, range),
      salesByType(db, restaurant.id, range),
      salesByPaymentMethod(db, restaurant.id, range),
      topItemsAndCategories(db, restaurant.id, range),
      topCustomers(db, restaurant.id, range),
    ]);
    csv = summaryCsv({
      range: { from: from ?? '', to: to ?? '' },
      summary,
      byDay: bucketRevenueByDay(rows, restaurant.timezone),
      byType,
      byMethod,
      topItems: top.items,
      topCategories: top.categories,
      topCustomers: custs,
    });
    name = 'summary';
  } else {
    // Full order list in range (all statuses); export isn't paginated.
    const { rows } = await listOrders(db, restaurant.id, { from: range.gte, to: range.lte, take: 100_000 });
    csv = ordersCsv(rows);
    name = 'orders';
  }

  const suffix = from || to ? `_${from ?? 'start'}_${to ?? 'end'}` : '';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}_${slug}${suffix}.csv"`,
    },
  });
}
