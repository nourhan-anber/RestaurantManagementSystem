'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { menuItemInputSchema } from '@/lib/validation/menu';
import { categoryInputSchema } from '@/lib/validation/category';
import {
  createMenuItem,
  deleteMenuItem,
  setItemAvailability,
  updateMenuItem,
} from '@/server/services/menu';
import {
  categoryBelongsTo,
  createCategory,
  deleteCategory,
  moveCategory,
  updateCategory,
} from '@/server/services/categories';

export interface MenuActionState {
  error?: string;
  ok?: boolean;
}

function optional(value: FormDataEntryValue | null): string | undefined {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s : undefined;
}

export async function saveMenuItem(
  slug: string,
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');

  const parsed = menuItemInputSchema.safeParse({
    name: formData.get('name'),
    categoryId: formData.get('categoryId'),
    description: optional(formData.get('description')),
    price: formData.get('price'),
    imageUrl: optional(formData.get('imageUrl')),
    isAvailable: formData.get('isAvailable') === 'on',
    dietaryTags: formData.getAll('dietaryTags'),
    spiceLevel: formData.get('spiceLevel') ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  // The category must belong to this restaurant (guards a crafted form).
  if (!(await categoryBelongsTo(db, restaurantId, parsed.data.categoryId))) {
    return { error: 'Choose a valid category.' };
  }

  const idRaw = formData.get('id');
  try {
    if (idRaw) {
      await updateMenuItem(db, restaurantId, Number(idRaw), parsed.data);
    } else {
      await createMenuItem(db, restaurantId, parsed.data);
    }
  } catch {
    return { error: 'Could not save the item.' };
  }

  revalidatePath(`/r/${slug}/menu`);
  return { ok: true };
}

export async function removeMenuItem(slug: string, id: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');
  try {
    await deleteMenuItem(db, restaurantId, id);
  } catch {
    // Referenced by past orders (FK restrict) — hide it instead of deleting.
    await db.menuItem.updateMany({ where: { id, restaurantId }, data: { isAvailable: false } });
  }
  revalidatePath(`/r/${slug}/menu`);
}

/** Quick 86 / re-enable — any operational role (chef/server) can flip availability mid-service. */
export async function toggleItemAvailability(slug: string, id: number, isAvailable: boolean): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'order:advance');
  await setItemAvailability(db, restaurantId, id, isAvailable);
  revalidatePath(`/r/${slug}/menu`);
  revalidatePath(`/r/${slug}/kitchen`);
}

// ─────────────────────────── Categories ───────────────────────────

export async function saveCategory(
  slug: string,
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');

  const parsed = categoryInputSchema.safeParse({
    name: formData.get('name'),
    isHidden: formData.get('isHidden') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const idRaw = formData.get('id');
  try {
    if (idRaw) {
      await updateCategory(db, restaurantId, Number(idRaw), parsed.data);
    } else {
      await createCategory(db, restaurantId, parsed.data);
    }
  } catch {
    return { error: `A category named "${parsed.data.name}" already exists.` };
  }

  revalidatePath(`/r/${slug}/menu`);
  return { ok: true };
}

export async function moveCategoryAction(
  slug: string,
  id: number,
  direction: 'up' | 'down',
): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');
  await moveCategory(db, restaurantId, id, direction);
  revalidatePath(`/r/${slug}/menu`);
}

export async function removeCategory(
  slug: string,
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');
  const result = await deleteCategory(db, restaurantId, Number(formData.get('categoryId')));
  revalidatePath(`/r/${slug}/menu`);
  if (!result.ok) {
    return {
      error:
        result.reason === 'has_items'
          ? 'Move or delete this category’s items first.'
          : 'Category not found.',
    };
  }
  return { ok: true };
}
