import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@/generated/prisma/client';
import { uniqueSlug } from '@/lib/slug';

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
