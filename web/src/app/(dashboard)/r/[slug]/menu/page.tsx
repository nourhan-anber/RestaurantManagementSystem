import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listMenu } from '@/server/services/menu';
import { listCategories } from '@/server/services/categories';
import { isUploadConfigured } from '@/server/storage';
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
    <div className="grid gap-8 lg:grid-cols-[1fr] xl:grid-cols-[20rem_1fr]">
      <div className="xl:order-2">
        <MenuManager slug={slug} items={rows} categories={cats} uploadConfigured={isUploadConfigured()} />
      </div>
      <div className="xl:order-1">
        <CategoryManager slug={slug} categories={cats} />
      </div>
    </div>
  );
}
