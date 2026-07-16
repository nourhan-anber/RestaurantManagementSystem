import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';

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
