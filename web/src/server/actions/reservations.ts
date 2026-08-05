'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/server/db';
import { requireAbility } from '@/server/tenant';
import { createReservation, seatReservation, setReservationStatus } from '@/server/services/reservations';
import { addWaitlist, setWaitlistStatus } from '@/server/services/waitlist';
import { createReservationSchema, waitlistSchema } from '@/lib/validation/reservation';

function revalidate(slug: string) {
  revalidatePath(`/r/${slug}/reservations`);
}

export interface ReservationState {
  error?: string;
  ok?: boolean;
}

export async function createReservationAction(
  slug: string,
  _prev: ReservationState,
  formData: FormData,
): Promise<ReservationState> {
  const { restaurantId } = await requireAbility(slug, 'table:write');

  const parsed = createReservationSchema.safeParse({
    name: formData.get('name'),
    phone: (formData.get('phone') as string | null)?.trim() || undefined,
    partySize: formData.get('partySize'),
    at: formData.get('at'),
    notes: (formData.get('notes') as string | null)?.trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  await createReservation(db, restaurantId, parsed.data);
  revalidate(slug);
  return { ok: true };
}

export async function seatReservationAction(slug: string, id: number, formData: FormData): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'table:write');
  const tableId = Number(formData.get('tableId'));
  if (!Number.isInteger(tableId)) return;
  await seatReservation(db, restaurantId, id, tableId);
  revalidate(slug);
}

export async function cancelReservationAction(slug: string, id: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'table:write');
  await setReservationStatus(db, restaurantId, id, 'CANCELLED');
  revalidate(slug);
}

export async function noShowReservationAction(slug: string, id: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'table:write');
  await setReservationStatus(db, restaurantId, id, 'NO_SHOW');
  revalidate(slug);
}

export interface WaitlistState {
  error?: string;
  ok?: boolean;
}

export async function addWaitlistAction(
  slug: string,
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const { restaurantId } = await requireAbility(slug, 'table:write');

  const parsed = waitlistSchema.safeParse({
    name: formData.get('name'),
    phone: (formData.get('phone') as string | null)?.trim() || undefined,
    partySize: formData.get('partySize'),
    quotedMinutes: formData.get('quotedMinutes'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  await addWaitlist(db, restaurantId, parsed.data);
  revalidate(slug);
  return { ok: true };
}

export async function seatWaitlistAction(slug: string, id: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'table:write');
  await setWaitlistStatus(db, restaurantId, id, 'SEATED');
  revalidate(slug);
}

export async function removeWaitlistAction(slug: string, id: number): Promise<void> {
  const { restaurantId } = await requireAbility(slug, 'table:write');
  await setWaitlistStatus(db, restaurantId, id, 'LEFT');
  revalidate(slug);
}
