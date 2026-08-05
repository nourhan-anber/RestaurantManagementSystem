import { describe, expect, it } from 'vitest';
import { expiryFromNow, generateToken, hashToken, isExpired } from './token';

describe('generateToken', () => {
  it('returns a non-empty URL-safe token that differs each call', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
  });
});

describe('hashToken', () => {
  it('is deterministic and differs for different inputs', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('expiryFromNow', () => {
  it('adds the given minutes', () => {
    const now = new Date('2026-07-16T12:00:00Z');
    expect(expiryFromNow(now, 60).toISOString()).toBe('2026-07-16T13:00:00.000Z');
  });
});

describe('isExpired', () => {
  const now = new Date('2026-07-16T12:00:00Z');
  it('is false before expiry, true at/after expiry', () => {
    expect(isExpired(new Date('2026-07-16T12:00:01Z'), now)).toBe(false);
    expect(isExpired(new Date('2026-07-16T12:00:00Z'), now)).toBe(true);
    expect(isExpired(new Date('2026-07-16T11:59:59Z'), now)).toBe(true);
  });
});
