import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listCategories } from '@/server/services/categories';
import { isUploadConfigured } from '@/server/storage';
import { MenuItemForm, type CategoryOption, type MenuRow } from '../menu-item-form';
import { ModifierEditor } from '../modifier-editor';

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ slug: string; itemId: string }>;
}) {
  const { slug, itemId } = await params;
  const id = Number(itemId);

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'menu:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant || !Number.isInteger(id)) notFound();

  const [item, categories] = await Promise.all([
    db.menuItem.findFirst({
      where: { id, restaurantId: restaurant.id },
      include: {
        category: { select: { name: true } },
        modifierGroups: {
          orderBy: { position: 'asc' },
          include: { options: { orderBy: { position: 'asc' } } },
        },
      },
    }),
    listCategories(db, restaurant.id),
  ]);
  if (!item) notFound();

  const row: MenuRow = {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    description: item.description,
    price: Number(item.price),
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    dietaryTags: item.dietaryTags,
    spiceLevel: item.spiceLevel,
    modifierGroups: item.modifierGroups.map((g) => ({
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
  };
  const cats: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    isHidden: c.isHidden,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/r/${slug}/menu`} className="text-sm text-muted hover:text-foreground">
        ← Menu
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Edit item</h1>
      <p className="text-sm text-muted">{row.name}</p>

      <div className="mt-6 space-y-6">
        <MenuItemForm slug={slug} item={row} categories={cats} uploadConfigured={isUploadConfigured()} />
        <ModifierEditor slug={slug} menuItemId={row.id} groups={row.modifierGroups} />
      </div>
    </div>
  );
}
