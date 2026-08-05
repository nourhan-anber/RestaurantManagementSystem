import { describe, expect, it } from 'vitest';
import { refundSchema, settleBillSchema } from './payment';

describe('settleBillSchema', () => {
  it('accepts cash without a transaction id', () => {
    expect(settleBillSchema.safeParse({ method: 'CASH' }).success).toBe(true);
  });

  it('requires a transaction id for card', () => {
    expect(settleBillSchema.safeParse({ method: 'CARD' }).success).toBe(false);
    expect(settleBillSchema.safeParse({ method: 'CARD', transactionId: 'auth_123' }).success).toBe(true);
  });

  it('rejects an unknown method', () => {
    expect(settleBillSchema.safeParse({ method: 'CRYPTO' }).success).toBe(false);
  });

  it('coerces a tip and treats blank as no tip', () => {
    const withTip = settleBillSchema.safeParse({ method: 'CASH', tip: '5.50' });
    expect(withTip.success && withTip.data.tip).toBe(5.5);
    const blank = settleBillSchema.safeParse({ method: 'CASH', tip: '' });
    expect(blank.success && blank.data.tip).toBeUndefined();
  });

  it('rejects a negative tip', () => {
    expect(settleBillSchema.safeParse({ method: 'CASH', tip: '-1' }).success).toBe(false);
  });

  it('coerces split orderIds from strings', () => {
    const parsed = settleBillSchema.safeParse({ method: 'CASH', orderIds: ['1', '2'] });
    expect(parsed.success && parsed.data.orderIds).toEqual([1, 2]);
  });
});

describe('refundSchema', () => {
  it('treats a blank amount as a full refund (undefined)', () => {
    const parsed = refundSchema.safeParse({ amount: '', reason: 'spilled' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.amount).toBeUndefined();
    expect(parsed.success && parsed.data.reason).toBe('spilled');
  });

  it('coerces a string amount to a number', () => {
    const parsed = refundSchema.safeParse({ amount: '12.50' });
    expect(parsed.success && parsed.data.amount).toBe(12.5);
  });

  it('rejects a zero or negative amount', () => {
    expect(refundSchema.safeParse({ amount: '0' }).success).toBe(false);
    expect(refundSchema.safeParse({ amount: '-5' }).success).toBe(false);
  });
});
