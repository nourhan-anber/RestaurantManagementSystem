import type { PrismaClient } from '@/generated/prisma/client';
import type { WaitlistStatus } from '@/generated/prisma/enums';

/** Parties still waiting, in the order they were added. */
export function listWaitlist(db: PrismaClient, restaurantId: number) {
  return db.waitlistEntry.findMany({
    where: { restaurantId, status: 'WAITING' },
    orderBy: { createdAt: 'asc' },
  });
}

export interface WaitlistInput {
  name: string;
  phone?: string;
  partySize: number;
  quotedMinutes?: number;
}

/** Add a walk-in party to the waitlist. */
export async function addWaitlist(
  db: PrismaClient,
  restaurantId: number,
  input: WaitlistInput,
): Promise<{ id: number }> {
  const created = await db.waitlistEntry.create({
    data: {
      restaurantId,
      name: input.name,
      phone: input.phone ?? null,
      partySize: input.partySize,
      quotedMinutes: input.quotedMinutes ?? null,
    },
  });
  return { id: created.id };
}

/** Mark a waitlist entry seated or left, tenant-scoped. */
export function setWaitlistStatus(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  status: WaitlistStatus,
) {
  return db.waitlistEntry.updateMany({ where: { id, restaurantId }, data: { status } });
}
