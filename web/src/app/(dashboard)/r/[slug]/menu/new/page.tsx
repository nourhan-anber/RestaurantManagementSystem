import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listCategories } from '@/server/services/categories';
import { isUploadConfigured } from '@/server/storage';
import { MenuItemForm, type CategoryOption } from '../menu-item-form';

export default async function NewMenuItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'menu:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const categories = await listCategories(db, restaurant.id);
  const cats: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    isHidden: c.isHidden,
  }));

  return (
    <div className="max-w-xl">
      <Link href={`/r/${slug}/menu`} className="text-sm text-muted hover:text-foreground">
        ← Menu
      </Link>
      <h1 className="mt-2 mb-6 font-display text-2xl tracking-tight text-foreground">Add item</h1>
      <MenuItemForm slug={slug} item={null} categories={cats} uploadConfigured={isUploadConfigured()} />
    </div>
  );
}
