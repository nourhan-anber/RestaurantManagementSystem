import { describe, expect, it } from 'vitest';
import {
  darkenHex,
  isStorefrontTemplate,
  isValidHexColor,
  normalizeHex,
  STOREFRONT_TEMPLATES,
} from './storefront';

describe('storefront templates', () => {
  it('has unique ids and recognizes them', () => {
    const ids = STOREFRONT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(isStorefrontTemplate)).toBe(true);
    expect(isStorefrontTemplate('nope')).toBe(false);
  });
});

describe('normalizeHex / isValidHexColor', () => {
  it('expands shorthand and lowercases', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#D8622D')).toBe('#d8622d');
  });

  it('rejects invalid or missing colors', () => {
    expect(normalizeHex('d8622d')).toBeNull(); // no hash
    expect(normalizeHex('#12345')).toBeNull(); // wrong length
    expect(normalizeHex('#zzzzzz')).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
    expect(normalizeHex(null)).toBeNull();
    expect(isValidHexColor('#abc')).toBe(true);
    expect(isValidHexColor('red')).toBe(false);
  });
});

describe('darkenHex', () => {
  it('darkens each channel and clamps at 0', () => {
    expect(darkenHex('#ffffff', 0.5)).toBe('#808080');
    expect(darkenHex('#000000', 0.5)).toBe('#000000');
  });

  it('expands shorthand before darkening', () => {
    expect(darkenHex('#fff', 0.5)).toBe('#808080');
  });

  it('falls back to the darkened default accent for an invalid/missing color', () => {
    expect(darkenHex('nope')).toBe(darkenHex('#d8622d'));
    expect(darkenHex(undefined)).toBe(darkenHex('#d8622d'));
  });
});
