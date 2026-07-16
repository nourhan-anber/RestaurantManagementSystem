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
    const parsed = menuItemInputSchema.parse(valid);
    expect(parsed.description).toBeUndefined();
    expect(parsed.dietaryTags).toEqual([]);
    expect(parsed.spiceLevel).toBe(0);
  });

  it('accepts dietary tags and coerces spice level', () => {
    const parsed = menuItemInputSchema.parse({ ...valid, dietaryTags: ['VEGAN'], spiceLevel: '2' });
    expect(parsed.dietaryTags).toEqual(['VEGAN']);
    expect(parsed.spiceLevel).toBe(2);
  });

  it('rejects an out-of-range spice level or unknown tag', () => {
    expect(menuItemInputSchema.safeParse({ ...valid, spiceLevel: 5 }).success).toBe(false);
    expect(menuItemInputSchema.safeParse({ ...valid, dietaryTags: ['NOPE'] }).success).toBe(false);
  });
});
