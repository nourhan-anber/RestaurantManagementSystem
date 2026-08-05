/** The restaurant-local calendar day of an instant, as 'YYYY-MM-DD'.
 *  en-CA formats dates ISO-style (YYYY-MM-DD), so format() gives the key directly. */
export function localDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** A short display label ('Jul 17') for a 'YYYY-MM-DD' day key. */
export function localDayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(d);
}
