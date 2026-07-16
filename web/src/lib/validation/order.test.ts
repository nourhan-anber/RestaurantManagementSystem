import { describe, expect, it } from 'vitest';
import { placeOrderSchema } from './order';

const valid = {
  slug: 'bella-vista',
  tableNumber: 7,
  token: 'abc',
  items: [{ menuItemId: 1, quantity: 2 }],
};

describe('placeOrderSchema', () => {
  it('accepts a valid order', () => {
    expect(placeOrderSchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one item', () => {
    expect(placeOrderSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('rejects a non-positive quantity', () => {
    expect(
      placeOrderSchema.safeParse({ ...valid, items: [{ menuItemId: 1, quantity: 0 }] }).success,
    ).toBe(false);
  });

  it('rejects a missing token', () => {
    expect(placeOrderSchema.safeParse({ ...valid, token: '' }).success).toBe(false);
  });

  it('defaults optionIds to [] and accepts guest fields', () => {
    const parsed = placeOrderSchema.parse({ ...valid, guestName: 'Sam', guestEmail: 'sam@x.com' });
    expect(parsed.items[0].optionIds).toEqual([]);
    expect(parsed.guestName).toBe('Sam');
  });

  it('rejects an invalid guest email', () => {
    expect(placeOrderSchema.safeParse({ ...valid, guestEmail: 'nope' }).success).toBe(false);
  });
});
