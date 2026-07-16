import { describe, expect, it } from 'vitest';
import { categoryInputSchema } from './category';

describe('categoryInputSchema', () => {
  it('accepts a name and defaults isHidden to false', () => {
    expect(categoryInputSchema.parse({ name: 'Mains' })).toEqual({ name: 'Mains', isHidden: false });
  });

  it('trims the name and honors isHidden', () => {
    expect(categoryInputSchema.parse({ name: '  Drinks  ', isHidden: true })).toEqual({
      name: 'Drinks',
      isHidden: true,
    });
  });

  it('rejects an empty name', () => {
    expect(categoryInputSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
