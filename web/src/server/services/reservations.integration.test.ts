import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import {
  createReservation,
  listReservations,
  seatReservation,
  setReservationStatus,
} from './reservations';
import { addWaitlist, listWaitlist, setWaitlistStatus } from './waitlist';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE reservations, waitlist_entries, customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, points_ledger, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture() {
  const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella' } });
  const t1 = await db.table.create({ data: { restaurantId: r.id, number: 1 } });
  const t2 = await db.table.create({ data: { restaurantId: r.id, number: 2 } });
  return { r, t1, t2 };
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('reservations', () => {
  it('books, lists by day, seats to a table, and updates status', async () => {
    const { r, t1 } = await fixture();
    const at = new Date('2026-07-16T19:30:00Z');
    const { id } = await createReservation(db, r.id, { name: 'Ada', partySize: 4, at, phone: '416-555-0100' });

    // Listed within the day range, excluded outside it.
    const inDay = await listReservations(db, r.id, {
      gte: new Date('2026-07-16T00:00:00Z'),
      lte: new Date('2026-07-16T23:59:59Z'),
    });
    expect(inDay).toHaveLength(1);
    expect(inDay[0]).toMatchObject({ name: 'Ada', partySize: 4, status: 'BOOKED' });

    const otherDay = await listReservations(db, r.id, {
      gte: new Date('2026-07-17T00:00:00Z'),
      lte: new Date('2026-07-17T23:59:59Z'),
    });
    expect(otherDay).toHaveLength(0);

    // Seat it.
    expect(await seatReservation(db, r.id, id, t1.id)).toEqual({ ok: true });
    const seated = await db.reservation.findUniqueOrThrow({ where: { id } });
    expect(seated.status).toBe('SEATED');
    expect(seated.tableId).toBe(t1.id);

    // No-show a different booking.
    const two = await createReservation(db, r.id, { name: 'Bo', partySize: 2, at });
    expect((await setReservationStatus(db, r.id, two.id, 'NO_SHOW')).count).toBe(1);
    expect((await db.reservation.findUniqueOrThrow({ where: { id: two.id } })).status).toBe('NO_SHOW');
  });

  it('refuses to double-book a table already holding a seated reservation', async () => {
    const { r, t1 } = await fixture();
    const at = new Date('2026-07-16T19:30:00Z');
    const a = await createReservation(db, r.id, { name: 'A', partySize: 2, at });
    const b = await createReservation(db, r.id, { name: 'B', partySize: 2, at });

    expect(await seatReservation(db, r.id, a.id, t1.id)).toEqual({ ok: true });
    // t1 now holds a seated reservation → seating B there is refused.
    expect(await seatReservation(db, r.id, b.id, t1.id)).toEqual({ ok: false, reason: 'table_taken' });
  });

  it('is tenant-scoped and reports missing rows', async () => {
    const { r, t1 } = await fixture();
    const a = await createReservation(db, r.id, { name: 'A', partySize: 2, at: new Date('2026-07-16T19:30:00Z') });
    expect(await seatReservation(db, 9999, a.id, t1.id)).toEqual({ ok: false, reason: 'not_found' });
    expect(await seatReservation(db, r.id, 9999, t1.id)).toEqual({ ok: false, reason: 'not_found' });
    expect(await seatReservation(db, r.id, a.id, 9999)).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('waitlist', () => {
  it('adds entries in FIFO order and removes them from the waiting list on seat/leave', async () => {
    const { r } = await fixture();
    const first = await addWaitlist(db, r.id, { name: 'First', partySize: 2, quotedMinutes: 15 });
    await addWaitlist(db, r.id, { name: 'Second', partySize: 4 });

    const waiting = await listWaitlist(db, r.id);
    expect(waiting.map((w) => w.name)).toEqual(['First', 'Second']);
    expect(waiting[0].quotedMinutes).toBe(15);

    // Seat the first party → it drops off the waiting list.
    expect((await setWaitlistStatus(db, r.id, first.id, 'SEATED')).count).toBe(1);
    expect((await listWaitlist(db, r.id)).map((w) => w.name)).toEqual(['Second']);
  });
});
