import { isOpenNow, type DayHours } from './hours';

export interface OrderSlot {
  iso: string; // the slot instant, UTC ISO
  label: string; // e.g. "Today · 6:30 PM"
}

function localDateKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** A friendly slot label relative to `now`, in the restaurant's timezone. */
export function formatSlotLabel(d: Date, now: Date, timeZone: string): string {
  const key = localDateKey(d, timeZone);
  const todayKey = localDateKey(now, timeZone);
  const tomorrowKey = localDateKey(new Date(now.getTime() + 86_400_000), timeZone);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  let day: string;
  if (key === todayKey) day = 'Today';
  else if (key === tomorrowKey) day = 'Tomorrow';
  else day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(d);

  return `${day} · ${time}`;
}

export interface SlotOptions {
  intervalMinutes?: number; // slot granularity (default 30)
  leadMinutes?: number; // earliest slot = now + lead (default 30)
  horizonHours?: number; // how far ahead to offer (default 72)
  max?: number; // cap the number of slots (default 48)
}

/**
 * Future time slots at which the restaurant is open, for scheduling an order
 * (including when it's currently closed). Works by stepping real instants forward
 * on the interval grid and keeping the ones where isOpenNow is true — so timezone
 * and overnight windows are handled by the same logic as the open/closed badge,
 * with no local→UTC conversion.
 */
export function orderableSlots(
  hours: readonly DayHours[],
  now: Date,
  timeZone: string,
  opts: SlotOptions = {},
): OrderSlot[] {
  const interval = opts.intervalMinutes ?? 30;
  const lead = opts.leadMinutes ?? 30;
  const horizon = opts.horizonHours ?? 72;
  const max = opts.max ?? 48;

  const intervalMs = interval * 60_000;
  const startMs = Math.ceil((now.getTime() + lead * 60_000) / intervalMs) * intervalMs;
  const endMs = now.getTime() + horizon * 3_600_000;

  const slots: OrderSlot[] = [];
  for (let ms = startMs; ms <= endMs && slots.length < max; ms += intervalMs) {
    const d = new Date(ms);
    if (isOpenNow(hours, d, timeZone)) {
      slots.push({ iso: d.toISOString(), label: formatSlotLabel(d, now, timeZone) });
    }
  }
  return slots;
}
