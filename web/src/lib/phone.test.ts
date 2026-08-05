import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('normalizes NANP numbers in various formats to the same canonical form', () => {
    const canonical = '+14165550199';
    for (const raw of ['416-555-0199', '(416) 555-0199', '4165550199', '1 416 555 0199', '14165550199']) {
      expect(normalizePhone(raw)).toBe(canonical);
    }
  });

  it('accepts and preserves a valid international number', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    // A +1 international form collapses to the same canonical NANP string.
    expect(normalizePhone('+1 416 555 0199')).toBe('+14165550199');
  });

  it('rejects implausible or malformed numbers', () => {
    expect(normalizePhone('555-0100')).toBeNull(); // 7 digits
    expect(normalizePhone('123-456-7890')).toBeNull(); // area code starts with 1
    expect(normalizePhone('416-155-0199')).toBeNull(); // exchange starts with 1
    expect(normalizePhone('not a phone')).toBeNull();
    expect(normalizePhone('4165550199+')).toBeNull(); // '+' not at start
    expect(normalizePhone('+12')).toBeNull(); // too short
    expect(normalizePhone('   ')).toBeNull();
  });
});

describe('isValidPhone', () => {
  it('mirrors normalizePhone success', () => {
    expect(isValidPhone('416-555-0199')).toBe(true);
    expect(isValidPhone('555-0100')).toBe(false);
  });
});
