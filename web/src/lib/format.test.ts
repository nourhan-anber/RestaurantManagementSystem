import { describe, expect, it } from 'vitest';
import { formatMoney, toCents } from './format';

describe('formatMoney', () => {
  it('formats numbers to two decimals', () => {
    expect(formatMoney(24)).toBe('$24.00');
    expect(formatMoney(9.5)).toBe('$9.50');
  });

  it('accepts numeric strings (Prisma Decimal)', () => {
    expect(formatMoney('12.00')).toBe('$12.00');
  });

  it('falls back to $0.00 for non-finite input', () => {
    expect(formatMoney('abc')).toBe('$0.00');
  });
});

describe('toCents', () => {
  it('converts dollars to integer cents', () => {
    expect(toCents(24)).toBe(2400);
    expect(toCents(9.5)).toBe(950);
    expect(toCents('12.99')).toBe(1299);
  });

  it('rounds to the nearest cent (no float drift)', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(7.675)).toBe(768);
  });

  it('returns 0 for non-finite input', () => {
    expect(toCents('abc')).toBe(0);
  });
});
