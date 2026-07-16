import { describe, expect, it } from 'vitest';
import { DIETARY_LABELS, DIETARY_TAGS, matchesDietary } from './dietary';

describe('dietary tags', () => {
  it('exposes a label for every tag', () => {
    expect(DIETARY_TAGS).toContain('VEGAN');
    expect(DIETARY_LABELS.GLUTEN_FREE).toBe('Gluten-free');
  });
});

describe('matchesDietary', () => {
  it('matches everything when no filter is active', () => {
    expect(matchesDietary(['VEGAN'], [])).toBe(true);
    expect(matchesDietary([], [])).toBe(true);
  });

  it('requires the item to carry every active tag (AND)', () => {
    expect(matchesDietary(['VEGAN', 'GLUTEN_FREE'], ['VEGAN'])).toBe(true);
    expect(matchesDietary(['VEGAN', 'GLUTEN_FREE'], ['VEGAN', 'GLUTEN_FREE'])).toBe(true);
    expect(matchesDietary(['VEGAN'], ['VEGAN', 'GLUTEN_FREE'])).toBe(false);
    expect(matchesDietary([], ['VEGAN'])).toBe(false);
  });
});
