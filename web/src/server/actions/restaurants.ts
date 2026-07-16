'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requirePlatformAdmin } from '@/server/tenant';
import { createRestaurantSchema } from '@/lib/validation/restaurant';
import { provisionRestaurant } from '@/server/services/restaurants';

export interface CreateRestaurantState {
  error?: string;
}

export async function createRestaurant(
  _prev: CreateRestaurantState,
  formData: FormData,
): Promise<CreateRestaurantState> {
  await requirePlatformAdmin();

  const parsed = createRestaurantSchema.safeParse({
    name: formData.get('name'),
    ownerName: formData.get('ownerName'),
    ownerEmail: formData.get('ownerEmail'),
    ownerPassword: formData.get('ownerPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  try {
    await provisionRestaurant(db, parsed.data);
  } catch {
    return { error: 'Could not create the restaurant. That owner may already manage it.' };
  }

  revalidatePath('/admin');
  redirect('/admin');
}
