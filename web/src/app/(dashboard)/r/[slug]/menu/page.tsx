import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { buttonClasses } from '@/components/ui/button';
import { listMenu } from '@/server/services/menu';
import { listCategories } from '@/server/services/categories';
import { CategoryManager } from './category-manager';
import { MenuManager } from './menu-manager';

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'menu:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const [items, categories] = await Promise.all([
    listMenu(db, restaurant.id),
    listCategories(db, restaurant.id),
  ]);

  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    categoryId: i.categoryId,
    categoryName: i.category.name,
    description: i.description,
    price: Number(i.price),
    imageUrl: i.imageUrl,
    isAvailable: i.isAvailable,
    dietaryTags: i.dietaryTags,
    spiceLevel: i.spiceLevel,
    modifierGroups: i.modifierGroups.map((g) => ({
      id: g.id,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        priceDelta: Number(o.priceDelta),
        isAvailable: o.isAvailable,
      })),
    })),
  }));
  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    isHidden: c.isHidden,
  }));

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl tracking-tight text-foreground">Menu</h1>
        {cats.length > 0 ? (
          <Link href={`/r/${slug}/menu/new`} className={buttonClasses({ size: 'sm' })}>
            Add item
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="order-2 lg:order-1">
          <CategoryManager slug={slug} categories={cats} />
        </div>
        <div className="order-1 lg:order-2">
          <MenuManager slug={slug} items={rows} categories={cats} />
        </div>
      </div>
    </div>
  );
}
