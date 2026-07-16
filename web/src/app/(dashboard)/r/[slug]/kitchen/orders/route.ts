import { NextResponse } from 'next/server';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listKitchenOrders } from '@/server/services/orders';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'order:advance')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const orders = await listKitchenOrders(db, restaurant.id);
  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      tableNumber: o.table.number,
      items: o.items.map((it) => ({
        id: it.id,
        name: it.menuItem.name,
        quantity: it.quantity,
        notes: it.notes,
      })),
    })),
  });
}
