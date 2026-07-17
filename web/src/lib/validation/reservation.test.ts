import { describe, expect, it } from 'vitest';
import { createReservationSchema, waitlistSchema } from './reservation';

describe('createReservationSchema', () => {
  it('accepts a valid booking and coerces types', () => {
    const parsed = createReservationSchema.safeParse({
      name: '  Ada  ',
      phone: '416-555-0100',
      partySize: '4',
      at: '2026-07-16T19:30',
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.name).toBe('Ada');
    expect(parsed.success && parsed.data.partySize).toBe(4);
    expect(parsed.success && parsed.data.at).toBeInstanceOf(Date);
  });

  it('allows an empty phone but rejects an invalid one', () => {
    expect(createReservationSchema.safeParse({ name: 'A', partySize: '2', at: '2026-07-16T19:30', phone: '' }).success).toBe(true);
    expect(createReservationSchema.safeParse({ name: 'A', partySize: '2', at: '2026-07-16T19:30', phone: 'abc' }).success).toBe(false);
  });

  it('rejects an empty name or a non-positive party size', () => {
    expect(createReservationSchema.safeParse({ name: '  ', partySize: '2', at: '2026-07-16T19:30' }).success).toBe(false);
    expect(createReservationSchema.safeParse({ name: 'A', partySize: '0', at: '2026-07-16T19:30' }).success).toBe(false);
  });
});

describe('waitlistSchema', () => {
  it('coerces party size and treats a blank quote as undefined', () => {
    const parsed = waitlistSchema.safeParse({ name: 'Bo', partySize: '3', quotedMinutes: '' });
    expect(parsed.success && parsed.data.partySize).toBe(3);
    expect(parsed.success && parsed.data.quotedMinutes).toBeUndefined();

    const withQuote = waitlistSchema.safeParse({ name: 'Bo', partySize: '3', quotedMinutes: '20' });
    expect(withQuote.success && withQuote.data.quotedMinutes).toBe(20);
  });
});
