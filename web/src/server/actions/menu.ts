'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { menuItemInputSchema } from '@/lib/validation/menu';
import { createMenuItem, deleteMenuItem, updateMenuItem } from '@/server/services/menu';

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
    category: formData.get('category'),
    description: optional(formData.get('description')),
    price: formData.get('price'),
    imageUrl: optional(formData.get('imageUrl')),
    isAvailable: formData.get('isAvailable') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
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
