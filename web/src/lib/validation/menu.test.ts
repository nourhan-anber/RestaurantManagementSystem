import { describe, expect, it } from 'vitest';
import { menuItemInputSchema } from './menu';

const valid = { name: 'Risotto', categoryId: 1, price: 24, isAvailable: true };

describe('menuItemInputSchema', () => {
  it('accepts a valid item and coerces a string price', () => {
    const parsed = menuItemInputSchema.parse({ ...valid, price: '24.50' });
    expect(parsed.price).toBe(24.5);
  });

  it('rejects an empty name', () => {
    expect(menuItemInputSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects a non-positive price', () => {
    expect(menuItemInputSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
    expect(menuItemInputSchema.safeParse({ ...valid, price: -5 }).success).toBe(false);
  });

  it('rejects an invalid image URL', () => {
    expect(menuItemInputSchema.safeParse({ ...valid, imageUrl: 'not-a-url' }).success).toBe(false);
  });

  it('rejects a missing or non-positive category', () => {
    expect(menuItemInputSchema.safeParse({ ...valid, categoryId: 0 }).success).toBe(false);
  });

  it('allows optional description and imageUrl to be omitted', () => {
    expect(menuItemInputSchema.parse(valid).description).toBeUndefined();
  });
});
