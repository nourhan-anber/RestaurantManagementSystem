import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listKitchenOrders } from '@/server/services/orders';
import { listMenu } from '@/server/services/menu';
import { KitchenBoard, type KdsOrder } from './kitchen-board';
import { EightySixPanel } from './eighty-six-panel';

export default async function KitchenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'order:advance')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const [orders, menu] = await Promise.all([
    listKitchenOrders(db, restaurant.id),
    listMenu(db, restaurant.id),
  ]);
  const items = menu.map((m) => ({ id: m.id, name: m.name, isAvailable: m.isAvailable }));
  const initial: KdsOrder[] = orders.map((o) => ({
    id: o.id,
    status: o.status as KdsOrder['status'],
    notes: o.notes,
    guestName: o.guestName,
    createdAt: o.createdAt.toISOString(),
    requestedTime: o.requestedTime ? o.requestedTime.toISOString() : null,
    tableNumber: o.table?.number ?? null,
    orderType: o.orderType,
    items: o.items.map((it) => ({
      id: it.id,
      name: it.menuItem.name,
      quantity: it.quantity,
      notes: it.notes,
      modifiers: it.modifiers.map((m) => m.optionName),
    })),
  }));

  return (
    <div>
      <EightySixPanel slug={slug} items={items} />
      <KitchenBoard slug={slug} initialOrders={initial} />
    </div>
  );
}
