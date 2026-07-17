import { describe, expect, it } from 'vitest';
import { allocateTip, computeTip, TIP_PRESETS } from './tip';

describe('computeTip', () => {
  it('computes a percentage tip rounded to cents', () => {
    expect(computeTip(30, 20)).toBe(6);
    expect(computeTip(33.9, 18)).toBe(6.1); // 6.102 → 6.10
  });

  it('returns 0 for a non-positive base or percent', () => {
    expect(computeTip(0, 20)).toBe(0);
    expect(computeTip(-5, 20)).toBe(0);
    expect(computeTip(30, 0)).toBe(0);
  });

  it('exposes sensible presets', () => {
    expect(TIP_PRESETS).toEqual([15, 18, 20]);
  });
});

describe('allocateTip', () => {
  it('splits proportionally to each order total', () => {
    expect(allocateTip([10, 20], 6)).toEqual([2, 4]);
  });

  it('sums exactly to the tip even when rounding is needed', () => {
    const parts = allocateTip([10, 10, 10], 10); // 3.33 / 3.33 / 3.34
    expect(parts.reduce((s, p) => s + p, 0)).toBeCloseTo(10, 2);
    expect(Math.max(...parts) - Math.min(...parts)).toBeCloseTo(0.01, 2);
  });

  it('splits evenly when totals carry no weight', () => {
    expect(allocateTip([0, 0], 5)).toEqual([2.5, 2.5]);
  });

  it('returns zeros for a zero or negative tip', () => {
    expect(allocateTip([10, 20], 0)).toEqual([0, 0]);
    expect(allocateTip([10, 20], -3)).toEqual([0, 0]);
  });

  it('handles an empty order list', () => {
    expect(allocateTip([], 5)).toEqual([]);
  });

  it('assigns the whole tip to a single order', () => {
    expect(allocateTip([25], 4.5)).toEqual([4.5]);
  });
});
