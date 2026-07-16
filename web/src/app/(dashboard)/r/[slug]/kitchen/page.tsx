import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listKitchenOrders } from '@/server/services/orders';
import { KitchenBoard, type KdsOrder } from './kitchen-board';

export default async function KitchenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'order:advance')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const orders = await listKitchenOrders(db, restaurant.id);
  const initial: KdsOrder[] = orders.map((o) => ({
    id: o.id,
    status: o.status as KdsOrder['status'],
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    tableNumber: o.table.number,
    items: o.items.map((it) => ({
      id: it.id,
      name: it.menuItem.name,
      quantity: it.quantity,
      notes: it.notes,
    })),
  }));

  return <KitchenBoard slug={slug} initialOrders={initial} />;
}
