'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/server/db';
import { requireAbility, requirePlatformAdmin } from '@/server/tenant';
import { brandingSchema, createRestaurantSchema, hoursSchema } from '@/lib/validation/restaurant';
import {
  provisionRestaurant,
  setOpeningHours,
  updateRestaurantBranding,
} from '@/server/services/restaurants';
import { hhmmToMinutes } from '@/lib/hours';

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

export interface BrandingState {
  error?: string;
  ok?: boolean;
}

function optional(value: FormDataEntryValue | null): string | undefined {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s : undefined;
}

export async function updateBranding(
  slug: string,
  _prev: BrandingState,
  formData: FormData,
): Promise<BrandingState> {
  const { restaurantId } = await requireAbility(slug, 'settings:write');

  const branding = brandingSchema.safeParse({
    name: formData.get('name'),
    description: optional(formData.get('description')),
    phone: optional(formData.get('phone')),
    address: optional(formData.get('address')),
    timezone: formData.get('timezone'),
    logoUrl: optional(formData.get('logoUrl')),
    onlineOrderingEnabled: formData.get('onlineOrderingEnabled') === 'on',
    taxEnabled: formData.get('taxEnabled') === 'on',
    taxRegion: optional(formData.get('taxRegion')),
    taxRatePercent: formData.get('taxRatePercent') ?? undefined,
    taxLabel: optional(formData.get('taxLabel')),
    storefrontTemplate: optional(formData.get('storefrontTemplate')),
    themeColor: optional(formData.get('themeColor')),
  });
  if (!branding.success) {
    return { error: branding.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const rows = Array.from({ length: 7 }, (_, day) => ({
    dayOfWeek: day,
    isClosed: formData.get(`day_${day}_closed`) === 'on',
    opensMinutes: hhmmToMinutes((formData.get(`day_${day}_open`) as string) ?? '00:00'),
    closesMinutes: hhmmToMinutes((formData.get(`day_${day}_close`) as string) ?? '00:00'),
  }));
  const hours = hoursSchema.safeParse(rows);
  if (!hours.success) {
    return { error: hours.error.issues[0]?.message ?? 'Invalid hours.' };
  }

  await updateRestaurantBranding(db, restaurantId, branding.data);
  await setOpeningHours(db, restaurantId, hours.data);
  revalidatePath(`/r/${slug}/settings`);
  return { ok: true };
}
