export interface DayHours {
  dayOfWeek: number; // 0=Sunday .. 6=Saturday
  opensMinutes: number; // minutes from local midnight
  closesMinutes: number;
  isClosed: boolean;
}

export const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "13:30" -> 810 minutes; clamps to [0,1440]; invalid -> 0. */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.min(1440, Math.max(0, h * 60 + m));
}

/** 810 -> "13:30". */
export function minutesToHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The restaurant-local weekday (0-6) and minutes-since-midnight for an instant. */
export function localDayAndMinute(now: Date, timeZone: string): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { day: WEEKDAY_INDEX[weekday] ?? 0, minute: hour * 60 + minute };
}

/**
 * Is the restaurant open at `now` in its `timeZone`, given per-day hours?
 * Handles closed days, normal windows [opens, closes), and overnight windows
 * (closes <= opens spills into the next day).
 */
export function isOpenNow(hours: readonly DayHours[], now: Date, timeZone: string): boolean {
  const { day, minute } = localDayAndMinute(now, timeZone);
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));

  const today = byDay.get(day);
  if (today && !today.isClosed) {
    if (today.closesMinutes > today.opensMinutes) {
      if (minute >= today.opensMinutes && minute < today.closesMinutes) return true;
    } else if (minute >= today.opensMinutes) {
      // overnight (closes <= opens): open from opensMinutes until local midnight
      return true;
    }
  }

  // Yesterday's overnight window spilling into this morning.
  const yesterday = byDay.get((day + 6) % 7);
  if (yesterday && !yesterday.isClosed && yesterday.closesMinutes <= yesterday.opensMinutes) {
    if (minute < yesterday.closesMinutes) return true;
  }

  return false;
}
