import { describe, expect, it } from 'vitest';
import { percentOfMax, safeAverage } from './reports';

describe('percentOfMax', () => {
  it('computes a rounded percentage', () => {
    expect(percentOfMax(1, 4)).toBe(25);
    expect(percentOfMax(3, 4)).toBe(75);
  });

  it('returns 0 when max is 0 or negative', () => {
    expect(percentOfMax(5, 0)).toBe(0);
    expect(percentOfMax(5, -1)).toBe(0);
  });
});

describe('safeAverage', () => {
  it('divides, or returns 0 at count 0', () => {
    expect(safeAverage(60, 3)).toBe(20);
    expect(safeAverage(60, 0)).toBe(0);
  });
});
