import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@/generated/prisma/client';
import { uniqueSlug } from '@/lib/slug';
import { resolveTaxConfig } from '@/lib/tax';
import type { BrandingInput, HoursInput } from '@/lib/validation/restaurant';

export interface ProvisionRestaurantInput {
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface ProvisionRestaurantResult {
  restaurantId: number;
  slug: string;
}

/**
 * Create a tenant and its first OWNER in one transaction. The owner user is
 * upserted by email, so an existing user simply gains a new OWNER membership.
 * Slug collisions are resolved deterministically (-2, -3, …).
 */
export async function provisionRestaurant(
  db: PrismaClient,
  input: ProvisionRestaurantInput,
): Promise<ProvisionRestaurantResult> {
  const existing = await db.restaurant.findMany({ select: { slug: true } });
  const slug = uniqueSlug(input.name, new Set(existing.map((r) => r.slug)));
  const passwordHash = await bcrypt.hash(input.ownerPassword, 10);

  return db.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({ data: { name: input.name, slug } });
    const owner = await tx.user.upsert({
      where: { email: input.ownerEmail },
      update: { name: input.ownerName },
      create: { email: input.ownerEmail, name: input.ownerName, passwordHash },
    });
    await tx.membership.create({
      data: { userId: owner.id, restaurantId: restaurant.id, role: 'OWNER' },
    });
    return { restaurantId: restaurant.id, slug };
  });
}

// ─────────────────────── Branding + hours ───────────────────────

export function getOpeningHours(db: PrismaClient, restaurantId: number) {
  return db.openingHours.findMany({ where: { restaurantId }, orderBy: { dayOfWeek: 'asc' } });
}

export function updateRestaurantBranding(
  db: PrismaClient,
  restaurantId: number,
  input: BrandingInput,
) {
  const tax = resolveTaxConfig(input.taxRegion, input.taxRatePercent ?? 0, input.taxLabel ?? 'Tax');
  return db.restaurant.update({
    where: { id: restaurantId },
    data: {
      name: input.name,
      description: input.description ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      timezone: input.timezone,
      logoUrl: input.logoUrl ?? null,
      onlineOrderingEnabled: input.onlineOrderingEnabled,
      ordersPaused: input.ordersPaused ?? false,
      taxEnabled: input.taxEnabled ?? false,
      taxRatePercent: tax.ratePercent,
      taxLabel: tax.label,
      taxRegion: tax.region,
      storefrontTemplate: input.storefrontTemplate ?? 'classic',
      themeColor: input.themeColor ?? '#d8622d',
    },
  });
}

/** Replace the whole week of hours atomically (one row per day). */
export async function setOpeningHours(db: PrismaClient, restaurantId: number, rows: HoursInput) {
  await db.$transaction([
    db.openingHours.deleteMany({ where: { restaurantId } }),
    db.openingHours.createMany({ data: rows.map((r) => ({ restaurantId, ...r })) }),
  ]);
}
