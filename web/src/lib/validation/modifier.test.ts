import { describe, expect, it } from 'vitest';
import { modifierGroupInputSchema, modifierOptionInputSchema } from './modifier';

describe('modifierGroupInputSchema', () => {
  it('accepts a single-select required group', () => {
    expect(modifierGroupInputSchema.safeParse({ name: 'Size', minSelect: 1, maxSelect: 1 }).success).toBe(true);
  });

  it('accepts an optional unlimited group (null max)', () => {
    expect(modifierGroupInputSchema.safeParse({ name: 'Add-ons', minSelect: 0, maxSelect: null }).success).toBe(true);
  });

  it('coerces string minSelect from a form', () => {
    const parsed = modifierGroupInputSchema.parse({ name: 'Size', minSelect: '2', maxSelect: 3 });
    expect(parsed.minSelect).toBe(2);
  });

  it('rejects max below min', () => {
    expect(modifierGroupInputSchema.safeParse({ name: 'Size', minSelect: 2, maxSelect: 1 }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(modifierGroupInputSchema.safeParse({ name: '', minSelect: 0, maxSelect: null }).success).toBe(false);
  });
});

describe('modifierOptionInputSchema', () => {
  it('accepts a priced option and coerces the delta', () => {
    const parsed = modifierOptionInputSchema.parse({ name: 'Large', priceDelta: '4.50', isAvailable: true });
    expect(parsed.priceDelta).toBe(4.5);
  });

  it('allows a negative delta (discount)', () => {
    expect(modifierOptionInputSchema.safeParse({ name: 'No cheese', priceDelta: -1, isAvailable: true }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(modifierOptionInputSchema.safeParse({ name: '', priceDelta: 0, isAvailable: true }).success).toBe(false);
  });
});
