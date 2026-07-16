import { describe, expect, it } from 'vitest';
import { generateTableToken, verifyTableToken } from './table-token';

describe('table tokens', () => {
  it('is deterministic for the same restaurant + table', () => {
    expect(generateTableToken(1, 7)).toBe(generateTableToken(1, 7));
  });

  it('verifies a valid token', () => {
    expect(verifyTableToken(1, 7, generateTableToken(1, 7))).toBe(true);
  });

  it('rejects a token minted for another restaurant (cross-tenant)', () => {
    const tokenForR1 = generateTableToken(1, 7);
    expect(verifyTableToken(2, 7, tokenForR1)).toBe(false);
  });

  it('rejects a token for another table', () => {
    expect(verifyTableToken(1, 8, generateTableToken(1, 7))).toBe(false);
  });

  it('rejects missing or malformed tokens', () => {
    expect(verifyTableToken(1, 7, null)).toBe(false);
    expect(verifyTableToken(1, 7, undefined)).toBe(false);
    expect(verifyTableToken(1, 7, 'not-hex-zz')).toBe(false);
    expect(verifyTableToken(1, 7, 'abcd')).toBe(false);
  });
});
