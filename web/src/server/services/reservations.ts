import type { PrismaClient } from '@/generated/prisma/client';
import type { ReservationSource, ReservationStatus } from '@/generated/prisma/enums';

/** Reservations within a datetime range (whole day, typically), earliest first. */
export function listReservations(
  db: PrismaClient,
  restaurantId: number,
  range: { gte?: Date; lte?: Date },
) {
  const at =
    range.gte || range.lte
      ? { at: { ...(range.gte ? { gte: range.gte } : {}), ...(range.lte ? { lte: range.lte } : {}) } }
      : {};
  return db.reservation.findMany({
    where: { restaurantId, ...at },
    orderBy: { at: 'asc' },
    include: { table: { select: { number: true } } },
  });
}

export interface ReservationInput {
  name: string;
  phone?: string;
  partySize: number;
  at: Date;
  notes?: string;
  source?: ReservationSource;
}

/** Book a reservation (staff or online). */
export async function createReservation(
  db: PrismaClient,
  restaurantId: number,
  input: ReservationInput,
): Promise<{ id: number }> {
  const created = await db.reservation.create({
    data: {
      restaurantId,
      name: input.name,
      phone: input.phone ?? null,
      partySize: input.partySize,
      at: input.at,
      notes: input.notes ?? null,
      source: input.source ?? 'STAFF',
    },
  });
  return { id: created.id };
}

export type SeatResult = { ok: true } | { ok: false; reason: 'not_found' | 'table_taken' };

/**
 * Seat a reservation at a table → SEATED. Double-book guard: refuses if another
 * still-seated reservation already holds that table.
 */
export async function seatReservation(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  tableId: number,
): Promise<SeatResult> {
  const reservation = await db.reservation.findFirst({ where: { id, restaurantId }, select: { id: true } });
  if (!reservation) return { ok: false, reason: 'not_found' };

  const table = await db.table.findFirst({ where: { id: tableId, restaurantId }, select: { id: true } });
  if (!table) return { ok: false, reason: 'not_found' };

  const clash = await db.reservation.findFirst({
    where: { restaurantId, tableId, status: 'SEATED', NOT: { id } },
    select: { id: true },
  });
  if (clash) return { ok: false, reason: 'table_taken' };

  await db.reservation.update({ where: { id }, data: { tableId, status: 'SEATED' } });
  return { ok: true };
}

/** Update a reservation's status (cancel / no-show / re-book), tenant-scoped. */
export function setReservationStatus(
  db: PrismaClient,
  restaurantId: number,
  id: number,
  status: ReservationStatus,
) {
  return db.reservation.updateMany({ where: { id, restaurantId }, data: { status } });
}
