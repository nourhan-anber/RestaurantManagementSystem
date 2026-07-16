import type { PrismaClient } from '@/generated/prisma/client';
import type { CategoryInput } from '@/lib/validation/category';

export function listCategories(db: PrismaClient, restaurantId: number) {
  return db.menuCategory.findMany({ where: { restaurantId }, orderBy: { position: 'asc' } });
}

export async function createCategory(db: PrismaClient, restaurantId: number, input: CategoryInput) {
  const position = await db.menuCategory.count({ where: { restaurantId } });
  return db.menuCategory.create({
    data: { restaurantId, name: input.name, isHidden: input.isHidden, position },
  });
}

// Scoped write: a foreign id updates zero rows.
export function updateCategory(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  input: CategoryInput,
) {
  return db.menuCategory.updateMany({
    where: { id, restaurantId },
    data: { name: input.name, isHidden: input.isHidden },
  });
}

export function setCategoryHidden(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  isHidden: boolean,
) {
  return db.menuCategory.updateMany({ where: { id, restaurantId }, data: { isHidden } });
}

/** Move a category one slot up/down by swapping positions with its neighbor. */
export async function moveCategory(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  direction: 'up' | 'down',
): Promise<void> {
  const cats = await db.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { position: 'asc' },
  });
  const idx = cats.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= cats.length) return;

  const a = cats[idx];
  const b = cats[swapIdx];
  await db.$transaction([
    db.menuCategory.updateMany({ where: { id: a.id, restaurantId }, data: { position: b.position } }),
    db.menuCategory.updateMany({ where: { id: b.id, restaurantId }, data: { position: a.position } }),
  ]);
}

export type DeleteCategoryResult = { ok: true } | { ok: false; reason: 'has_items' | 'not_found' };

/** Delete only when empty — a category with items would orphan them (FK Restrict). */
export async function deleteCategory(
  db: PrismaClient,
  restaurantId: number,
  id: number,
): Promise<DeleteCategoryResult> {
  const itemCount = await db.menuItem.count({ where: { restaurantId, categoryId: id } });
  if (itemCount > 0) return { ok: false, reason: 'has_items' };
  const res = await db.menuCategory.deleteMany({ where: { id, restaurantId } });
  return res.count > 0 ? { ok: true } : { ok: false, reason: 'not_found' };
}

/** True if the category belongs to the restaurant (guards cross-tenant assignment). */
export async function categoryBelongsTo(
  db: PrismaClient,
  restaurantId: number,
  categoryId: number,
): Promise<boolean> {
  const cat = await db.menuCategory.findFirst({
    where: { id: categoryId, restaurantId },
    select: { id: true },
  });
  return cat !== null;
}
