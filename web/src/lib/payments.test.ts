import { describe, expect, it } from 'vitest';
import { requiresReference, SETTLE_METHODS, SETTLE_METHOD_LABELS } from './payments';

describe('requiresReference', () => {
  it('requires a reference for card only', () => {
    expect(requiresReference('CARD')).toBe(true);
    expect(requiresReference('CASH')).toBe(false);
    expect(requiresReference('OTHER')).toBe(false);
  });
});

describe('settle methods', () => {
  it('exposes a label for every method', () => {
    expect(SETTLE_METHODS).toEqual(['CASH', 'CARD', 'OTHER']);
    expect(SETTLE_METHOD_LABELS.CARD).toBe('Card');
  });
});
