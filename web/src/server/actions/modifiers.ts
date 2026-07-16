'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { modifierGroupInputSchema, modifierOptionInputSchema } from '@/lib/validation/modifier';
import {
  createGroup,
  createOption,
  deleteGroup,
  deleteOption,
  updateGroup,
  updateOption,
} from '@/server/services/modifiers';

export interface ModifierActionState {
  error?: string;
  ok?: boolean;
}

const revalidate = (slug: string) => revalidatePath(`/r/${slug}/menu`);

/** Empty max field -> null (unlimited); otherwise a number. */
function maxSelectFromForm(value: FormDataEntryValue | null): number | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s === '' ? null : Number(s);
}

export async function saveModifierGroup(
  slug: string,
  menuItemId: number,
  _prev: ModifierActionState,
  formData: FormData,
): Promise<ModifierActionState> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');
  const parsed = modifierGroupInputSchema.safeParse({
    name: formData.get('name'),
    minSelect: formData.get('minSelect'),
    maxSelect: maxSelectFromForm(formData.get('maxSelect')),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const groupIdRaw = formData.get('groupId');
  const res = groupIdRaw
    ? await updateGroup(db, restaurantId, Number(groupIdRaw), parsed.data)
    : await createGroup(db, restaurantId, menuItemId, parsed.data);
  if (!res.ok) return { error: 'Could not save the option group.' };
  revalidate(slug);
  return { ok: true };
}

export async function removeModifierGroup(slug: string, groupId: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');
  await deleteGroup(db, restaurantId, groupId);
  revalidate(slug);
}

export async function saveModifierOption(
  slug: string,
  _prev: ModifierActionState,
  formData: FormData,
): Promise<ModifierActionState> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');
  const parsed = modifierOptionInputSchema.safeParse({
    name: formData.get('name'),
    priceDelta: formData.get('priceDelta') || 0,
    isAvailable: formData.get('isAvailable') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const optionIdRaw = formData.get('optionId');
  const res = optionIdRaw
    ? await updateOption(db, restaurantId, Number(optionIdRaw), parsed.data)
    : await createOption(db, restaurantId, Number(formData.get('groupId')), parsed.data);
  if (!res.ok) return { error: 'Could not save the option.' };
  revalidate(slug);
  return { ok: true };
}

export async function removeModifierOption(slug: string, optionId: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'menu:write');
  await deleteOption(db, restaurantId, optionId);
  revalidate(slug);
}
