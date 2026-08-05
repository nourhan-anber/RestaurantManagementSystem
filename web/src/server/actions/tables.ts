'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { tableInputSchema } from '@/lib/validation/table';
import { createTable, deleteTable, updateTable } from '@/server/services/tables';

export interface TableActionState {
  error?: string;
  ok?: boolean;
}

export async function saveTable(
  slug: string,
  _prev: TableActionState,
  formData: FormData,
): Promise<TableActionState> {
  const { restaurantId } = await requireAbility(slug, 'table:write');

  const parsed = tableInputSchema.safeParse({
    number: formData.get('number'),
    capacity: formData.get('capacity'),
    isActive: formData.get('isActive') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const idRaw = formData.get('id');
  try {
    if (idRaw) {
      await updateTable(db, restaurantId, Number(idRaw), parsed.data);
    } else {
      await createTable(db, restaurantId, parsed.data);
    }
  } catch {
    return { error: `Table ${parsed.data.number} already exists.` };
  }

  revalidatePath(`/r/${slug}/tables`);
  return { ok: true };
}

export async function removeTable(slug: string, id: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'table:write');
  try {
    await deleteTable(db, restaurantId, id);
  } catch {
    // Has order history (FK restrict) — deactivate instead of deleting.
    await db.table.updateMany({ where: { id, restaurantId }, data: { isActive: false } });
  }
  revalidatePath(`/r/${slug}/tables`);
}
