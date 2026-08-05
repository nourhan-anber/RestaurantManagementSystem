import { describe, expect, it } from 'vitest';
import { createPromoSchema } from './promo';

describe('createPromoSchema', () => {
  it('accepts a percentage promo within 100%', () => {
    const parsed = createPromoSchema.safeParse({ code: 'save10', kind: 'PERCENT', value: '10' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.value).toBe(10);
  });

  it('rejects a percentage over 100%', () => {
    expect(createPromoSchema.safeParse({ code: 'x', kind: 'PERCENT', value: '150' }).success).toBe(false);
  });

  it('allows a flat amount over 100', () => {
    expect(createPromoSchema.safeParse({ code: 'big', kind: 'AMOUNT', value: '250' }).success).toBe(true);
  });

  it('coerces optional maxUses / expiresAt and treats blank as undefined', () => {
    const parsed = createPromoSchema.safeParse({ code: 'c', kind: 'AMOUNT', value: '5', maxUses: '', expiresAt: '' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.maxUses).toBeUndefined();
    expect(parsed.success && parsed.data.expiresAt).toBeUndefined();

    const withCaps = createPromoSchema.safeParse({ code: 'c', kind: 'AMOUNT', value: '5', maxUses: '100', expiresAt: '2026-12-31' });
    expect(withCaps.success && withCaps.data.maxUses).toBe(100);
    expect(withCaps.success && withCaps.data.expiresAt).toBeInstanceOf(Date);
  });

  it('rejects a zero or negative value', () => {
    expect(createPromoSchema.safeParse({ code: 'c', kind: 'AMOUNT', value: '0' }).success).toBe(false);
    expect(createPromoSchema.safeParse({ code: 'c', kind: 'AMOUNT', value: '-5' }).success).toBe(false);
  });
});
