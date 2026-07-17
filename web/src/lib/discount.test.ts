import { describe, expect, it } from 'vitest';
import { applyDiscount, orderTotals, validatePromo } from './discount';

describe('applyDiscount', () => {
  it('computes a percentage discount rounded to cents', () => {
    expect(applyDiscount(30, { kind: 'PERCENT', value: 10 })).toBe(3);
    expect(applyDiscount(33.33, { kind: 'PERCENT', value: 15 })).toBe(5); // 4.9995 → 5.00
  });

  it('applies a flat amount discount', () => {
    expect(applyDiscount(30, { kind: 'AMOUNT', value: 7.5 })).toBe(7.5);
  });

  it('clamps the discount to the subtotal and to non-negative', () => {
    expect(applyDiscount(20, { kind: 'AMOUNT', value: 50 })).toBe(20);
    expect(applyDiscount(20, { kind: 'PERCENT', value: 150 })).toBe(20);
    expect(applyDiscount(20, { kind: 'AMOUNT', value: -5 })).toBe(0);
  });

  it('returns 0 for a non-positive subtotal', () => {
    expect(applyDiscount(0, { kind: 'PERCENT', value: 10 })).toBe(0);
  });
});

describe('validatePromo', () => {
  const now = new Date('2026-07-16T12:00:00Z');
  const base = { active: true, expiresAt: null, maxUses: null, usedCount: 0 };

  it('accepts an active, unexpired, unexhausted promo', () => {
    expect(validatePromo(base, now)).toEqual({ ok: true });
    expect(validatePromo({ ...base, expiresAt: new Date('2026-07-17T00:00:00Z'), maxUses: 5, usedCount: 2 }, now)).toEqual({ ok: true });
  });

  it('rejects an inactive promo', () => {
    expect(validatePromo({ ...base, active: false }, now)).toEqual({ ok: false, reason: 'inactive' });
  });

  it('rejects an expired promo (expiry at or before now)', () => {
    expect(validatePromo({ ...base, expiresAt: new Date('2026-07-16T12:00:00Z') }, now)).toEqual({ ok: false, reason: 'expired' });
    expect(validatePromo({ ...base, expiresAt: new Date('2026-07-15T00:00:00Z') }, now)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects an exhausted promo', () => {
    expect(validatePromo({ ...base, maxUses: 3, usedCount: 3 }, now)).toEqual({ ok: false, reason: 'exhausted' });
  });
});

describe('orderTotals', () => {
  it('discounts the subtotal, then taxes the discounted base', () => {
    // 100 − 20 = 80 base; 13% tax = 10.40; total 90.40. subtotal stays 100.
    expect(orderTotals(100, 20, 13, true)).toEqual({
      subtotal: 100,
      discount: 20,
      taxableBase: 80,
      taxAmount: 10.4,
      total: 90.4,
    });
  });

  it('applies no tax when tax is disabled', () => {
    expect(orderTotals(50, 10, 13, false)).toEqual({
      subtotal: 50,
      discount: 10,
      taxableBase: 40,
      taxAmount: 0,
      total: 40,
    });
  });

  it('clamps an over-large discount to the subtotal (base and total go to zero)', () => {
    expect(orderTotals(30, 100, 13, true)).toEqual({
      subtotal: 30,
      discount: 30,
      taxableBase: 0,
      taxAmount: 0,
      total: 0,
    });
  });

  it('handles no discount (tax on the full subtotal)', () => {
    expect(orderTotals(20, 0, 13, true)).toMatchObject({ discount: 0, taxableBase: 20, taxAmount: 2.6, total: 22.6 });
  });
});
