'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { createPromo, deletePromo, setPromoActive } from '@/server/services/promos';
import { createPromoSchema } from '@/lib/validation/promo';

export interface PromoState {
  error?: string;
  ok?: boolean;
}

/** Create a promo code from Settings (gated on settings:write). */
export async function createPromoAction(
  slug: string,
  _prev: PromoState,
  formData: FormData,
): Promise<PromoState> {
  const { restaurantId } = await requireAbility(slug, 'settings:write');

  const parsed = createPromoSchema.safeParse({
    code: formData.get('code'),
    kind: formData.get('kind'),
    value: formData.get('value'),
    maxUses: formData.get('maxUses'),
    expiresAt: formData.get('expiresAt'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const result = await createPromo(db, restaurantId, parsed.data);
  if (!result.ok) return { error: 'A code with that name already exists.' };

  revalidatePath(`/r/${slug}/settings`);
  return { ok: true };
}

export async function togglePromoAction(slug: string, id: number, active: boolean): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'settings:write');
  await setPromoActive(db, restaurantId, id, active);
  revalidatePath(`/r/${slug}/settings`);
}

export async function deletePromoAction(slug: string, id: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'settings:write');
  await deletePromo(db, restaurantId, id);
  revalidatePath(`/r/${slug}/settings`);
}
