import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Bella Vista')).toBe('bella-vista');
  });

  it('strips diacritics', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
  });

  it('collapses symbols and trims edge hyphens', () => {
    expect(slugify('  The Grill & Bar!!  ')).toBe('the-grill-bar');
  });

  it('falls back to "restaurant" for empty/symbol-only input', () => {
    expect(slugify('!!!')).toBe('restaurant');
    expect(slugify('')).toBe('restaurant');
  });

  it('caps length', () => {
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when free', () => {
    expect(uniqueSlug('Bella Vista', new Set())).toBe('bella-vista');
  });

  it('appends the next free number on collision', () => {
    expect(uniqueSlug('Bella Vista', new Set(['bella-vista']))).toBe('bella-vista-2');
    expect(uniqueSlug('Bella Vista', new Set(['bella-vista', 'bella-vista-2']))).toBe('bella-vista-3');
  });
});
