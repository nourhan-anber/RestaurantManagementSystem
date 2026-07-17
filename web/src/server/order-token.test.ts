import { describe, expect, it } from 'vitest';
import { generateOrderToken, verifyOrderToken } from './order-token';

describe('order token', () => {
  it('round-trips a valid token back to its orderId', () => {
    expect(verifyOrderToken(generateOrderToken(42))).toBe(42);
    expect(verifyOrderToken(generateOrderToken(1))).toBe(1);
  });

  it('rejects a tampered id (signature no longer matches)', () => {
    const token = generateOrderToken(42);
    const forged = token.replace(/^42\./, '43.');
    expect(verifyOrderToken(forged)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const token = generateOrderToken(42);
    expect(verifyOrderToken(`${token}x`)).toBeNull();
  });

  it('rejects malformed, empty, or missing tokens', () => {
    expect(verifyOrderToken(null)).toBeNull();
    expect(verifyOrderToken(undefined)).toBeNull();
    expect(verifyOrderToken('')).toBeNull();
    expect(verifyOrderToken('nodot')).toBeNull();
    expect(verifyOrderToken('.abc')).toBeNull();
    expect(verifyOrderToken('abc.def')).toBeNull(); // non-numeric id
    expect(verifyOrderToken('-1.def')).toBeNull();
  });
});
