import { describe, expect, it } from 'vitest';
import { maxRedeemablePoints, pointsEarned, redeemValue } from './loyalty';

describe('pointsEarned', () => {
  it('floors points from spend × rate', () => {
    expect(pointsEarned(22.6, 1)).toBe(22);
    expect(pointsEarned(10, 2)).toBe(20);
    expect(pointsEarned(9.99, 1)).toBe(9);
  });

  it('returns 0 for non-positive spend or rate', () => {
    expect(pointsEarned(0, 1)).toBe(0);
    expect(pointsEarned(10, 0)).toBe(0);
    expect(pointsEarned(-5, 1)).toBe(0);
  });
});

describe('redeemValue', () => {
  it('converts points to cash, rounded to cents', () => {
    expect(redeemValue(100, 0.01)).toBe(1);
    expect(redeemValue(250, 0.01)).toBe(2.5);
    expect(redeemValue(33, 0.015)).toBe(0.5); // 0.495 → 0.50
  });

  it('returns 0 for non-positive inputs', () => {
    expect(redeemValue(0, 0.01)).toBe(0);
    expect(redeemValue(100, 0)).toBe(0);
  });
});

describe('maxRedeemablePoints', () => {
  it('caps by both the balance and the max discount', () => {
    // 500 points at $0.01 = $5, but the bill is only $3 → 300 points.
    expect(maxRedeemablePoints(500, 0.01, 3)).toBe(300);
    // Balance is the binding cap here.
    expect(maxRedeemablePoints(120, 0.01, 5)).toBe(120);
  });

  it('returns 0 for non-positive inputs', () => {
    expect(maxRedeemablePoints(0, 0.01, 5)).toBe(0);
    expect(maxRedeemablePoints(100, 0, 5)).toBe(0);
    expect(maxRedeemablePoints(100, 0.01, 0)).toBe(0);
  });
});
