import { describe, expect, it } from 'vitest';
import { localDayKey, localDayLabel } from './datetime';

describe('localDayKey', () => {
  it('uses the restaurant timezone, not UTC', () => {
    // 2026-07-17 02:00 UTC is still 2026-07-16 (22:00) in New York.
    const instant = new Date('2026-07-17T02:00:00Z');
    expect(localDayKey(instant, 'America/New_York')).toBe('2026-07-16');
    expect(localDayKey(instant, 'UTC')).toBe('2026-07-17');
  });

  it('handles a daytime instant consistently', () => {
    const instant = new Date('2026-07-17T16:00:00Z'); // noon EDT
    expect(localDayKey(instant, 'America/New_York')).toBe('2026-07-17');
    expect(localDayKey(instant, 'Asia/Tokyo')).toBe('2026-07-18'); // +9 → next day
  });
});

describe('localDayLabel', () => {
  it('formats a day key as a short month/day', () => {
    expect(localDayLabel('2026-07-17')).toBe('Jul 17');
    expect(localDayLabel('2026-12-01')).toBe('Dec 1');
  });

  it('falls back to the raw key for an invalid input', () => {
    expect(localDayLabel('not-a-date')).toBe('not-a-date');
  });
});
