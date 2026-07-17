import { describe, expect, it } from 'vitest';
import { formatSlotLabel, orderableSlots } from './schedule';
import { isOpenNow, type DayHours } from './hours';

// Open 11:00–22:00 (660–1320) every day.
const allOpen: DayHours[] = Array.from({ length: 7 }, (_, d) => ({
  dayOfWeek: d,
  opensMinutes: 660,
  closesMinutes: 1320,
  isClosed: false,
}));

// Thursday 08:00 UTC — before opening, so "now" is closed.
const NOW = new Date('2026-07-16T08:00:00Z');

describe('orderableSlots', () => {
  it('offers future slots even when currently closed, starting at the next open time', () => {
    const slots = orderableSlots(allOpen, NOW, 'UTC', { max: 100 });
    expect(slots.length).toBeGreaterThan(0);
    // First slot is today at open (11:00), not "now".
    expect(slots[0].iso).toBe('2026-07-16T11:00:00.000Z');
    expect(slots[0].label).toBe('Today · 11:00 AM');
    // Every slot is genuinely within an open window.
    expect(slots.every((s) => isOpenNow(allOpen, new Date(s.iso), 'UTC'))).toBe(true);
  });

  it('spans multiple days with Today / Tomorrow / weekday labels', () => {
    const slots = orderableSlots(allOpen, NOW, 'UTC', { max: 100 });
    expect(slots.some((s) => s.label.startsWith('Today'))).toBe(true);
    expect(slots.some((s) => s.label.startsWith('Tomorrow'))).toBe(true);
    expect(slots.some((s) => s.label.startsWith('Sat'))).toBe(true); // 2026-07-18
  });

  it('respects the max cap and the interval', () => {
    const slots = orderableSlots(allOpen, NOW, 'UTC', { max: 5, intervalMinutes: 30 });
    expect(slots).toHaveLength(5);
    expect(new Date(slots[1].iso).getTime() - new Date(slots[0].iso).getTime()).toBe(30 * 60_000);
  });

  it('skips closed days and returns nothing when never open', () => {
    const mondayClosed = allOpen.map((h) => (h.dayOfWeek === 1 ? { ...h, isClosed: true } : h));
    const slots = orderableSlots(mondayClosed, NOW, 'UTC', { max: 100 });
    // No Monday (2026-07-20) slots.
    expect(slots.some((s) => new Date(s.iso).getUTCDay() === 1)).toBe(false);

    const closed = allOpen.map((h) => ({ ...h, isClosed: true }));
    expect(orderableSlots(closed, NOW, 'UTC')).toEqual([]);
  });
});

describe('formatSlotLabel', () => {
  it('labels today, tomorrow, and further days', () => {
    expect(formatSlotLabel(new Date('2026-07-16T15:00:00Z'), NOW, 'UTC')).toBe('Today · 3:00 PM');
    expect(formatSlotLabel(new Date('2026-07-17T15:00:00Z'), NOW, 'UTC')).toBe('Tomorrow · 3:00 PM');
    expect(formatSlotLabel(new Date('2026-07-18T15:00:00Z'), NOW, 'UTC')).toMatch(/^Sat/);
  });
});
