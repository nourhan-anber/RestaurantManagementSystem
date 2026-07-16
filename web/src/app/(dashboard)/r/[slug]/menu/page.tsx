import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listMenu } from '@/server/services/menu';
import { MenuManager } from './menu-manager';

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'menu:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const items = await listMenu(db, restaurant.id);
  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    description: i.description,
    price: Number(i.price),
    imageUrl: i.imageUrl,
    isAvailable: i.isAvailable,
  }));

  return <MenuManager slug={slug} items={rows} />;
}
