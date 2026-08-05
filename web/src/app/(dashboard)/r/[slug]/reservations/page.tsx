import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listReservations } from '@/server/services/reservations';
import { listWaitlist } from '@/server/services/waitlist';
import {
  cancelReservationAction,
  noShowReservationAction,
  removeWaitlistAction,
  seatReservationAction,
  seatWaitlistAction,
} from '@/server/actions/reservations';
import { localDayKey } from '@/lib/datetime';
import { parseDateRange } from '@/lib/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NewReservationForm, WaitlistForm } from './reservation-forms';

const STATUS_STYLE: Record<string, string> = {
  BOOKED: 'bg-clay/30 text-muted',
  SEATED: 'bg-pine/10 text-pine dark:bg-linen/10 dark:text-linen',
  CANCELLED: 'bg-ember/10 text-ember-600',
  NO_SHOW: 'bg-ember/10 text-ember-600',
};

function timeLabel(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default async function ReservationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date } = await searchParams;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'table:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const day = date ?? localDayKey(new Date(), restaurant.timezone);
  const range = parseDateRange(day, day);

  const [reservations, waitlist, tables] = await Promise.all([
    listReservations(db, restaurant.id, range),
    listWaitlist(db, restaurant.id),
    db.table.findMany({ where: { restaurantId: restaurant.id, isActive: true }, orderBy: { number: 'asc' }, select: { id: true, number: true } }),
  ]);

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Reservations</h1>

      {/* Day picker */}
      <form className="mt-4 flex items-end gap-3" action={`/r/${slug}/reservations`}>
        <div className="space-y-1.5">
          <label htmlFor="date" className="text-sm text-muted">Date</label>
          <Input id="date" name="date" type="date" defaultValue={day} className="w-44" />
        </div>
        <Button type="submit" variant="secondary">View</Button>
      </form>

      {/* New reservation */}
      <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">New reservation</h2>
        <div className="mt-3">
          <NewReservationForm slug={slug} defaultAt={`${day}T19:00`} />
        </div>
      </section>

      {/* Reservation list */}
      <h2 className="mt-8 text-xs font-medium uppercase tracking-wide text-muted">Bookings · {day}</h2>
      {reservations.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No reservations for this day.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {reservations.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm">
              <div>
                <span className="font-medium text-foreground">{timeLabel(r.at)} · {r.name}</span>
                <span className="ml-2 text-muted">
                  party of {r.partySize}
                  {r.phone ? ` · ${r.phone}` : ''}
                  {r.table ? ` · table ${r.table.number}` : ''}
                </span>
                {r.notes ? <span className="ml-2 text-muted">“{r.notes}”</span> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status] ?? ''}`}>
                  {r.status.toLowerCase().replace('_', ' ')}
                </span>
                {r.status === 'BOOKED' ? (
                  <>
                    <form action={seatReservationAction.bind(null, slug, r.id)} className="flex items-center gap-1">
                      <select name="tableId" required className="h-8 rounded-[var(--radius)] border border-border bg-background px-2 text-xs text-foreground">
                        <option value="">Table…</option>
                        {tables.map((t) => (
                          <option key={t.id} value={t.id}>#{t.number}</option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="ghost">Seat</Button>
                    </form>
                    <form action={noShowReservationAction.bind(null, slug, r.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-ember-600">No-show</Button>
                    </form>
                    <form action={cancelReservationAction.bind(null, slug, r.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-ember-600">Cancel</Button>
                    </form>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Waitlist */}
      <section className="mt-10 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Walk-in waitlist</h2>
        <div className="mt-3">
          <WaitlistForm slug={slug} />
        </div>

        {waitlist.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No one waiting.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {waitlist.map((w, i) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  <span className="text-muted tabular-nums">{i + 1}.</span>{' '}
                  <span className="font-medium text-foreground">{w.name}</span>
                  <span className="ml-2 text-muted">
                    party of {w.partySize}
                    {w.quotedMinutes != null ? ` · quoted ${w.quotedMinutes} min` : ''}
                    {w.phone ? ` · ${w.phone}` : ''}
                  </span>
                </span>
                <span className="flex gap-2">
                  <form action={seatWaitlistAction.bind(null, slug, w.id)}>
                    <Button type="submit" size="sm" variant="ghost">Seat</Button>
                  </form>
                  <form action={removeWaitlistAction.bind(null, slug, w.id)}>
                    <Button type="submit" size="sm" variant="ghost" className="text-ember-600">Remove</Button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
