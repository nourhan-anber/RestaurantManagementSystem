import { describe, expect, it } from 'vitest';
import { pageInfo, parseDateRange, parsePage } from './pagination';

describe('parsePage', () => {
  it('defaults to page 1 for missing/invalid values', () => {
    expect(parsePage(undefined)).toMatchObject({ page: 1, skip: 0, take: 20 });
    expect(parsePage('0')).toMatchObject({ page: 1, skip: 0 });
    expect(parsePage('-3')).toMatchObject({ page: 1 });
    expect(parsePage('abc')).toMatchObject({ page: 1 });
  });

  it('computes skip/take from the page and size', () => {
    expect(parsePage('3', 10)).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });
});

describe('pageInfo', () => {
  it('handles an empty result set', () => {
    expect(pageInfo(0, 1, 20)).toEqual({ page: 1, totalPages: 1, from: 0, to: 0, hasPrev: false, hasNext: false });
  });

  it('reports the row window and nav flags', () => {
    expect(pageInfo(45, 2, 20)).toEqual({ page: 2, totalPages: 3, from: 21, to: 40, hasPrev: true, hasNext: true });
    expect(pageInfo(45, 3, 20)).toEqual({ page: 3, totalPages: 3, from: 41, to: 45, hasPrev: true, hasNext: false });
  });

  it('clamps an out-of-range page to the last page', () => {
    expect(pageInfo(45, 99, 20)).toMatchObject({ page: 3, hasNext: false });
  });
});

describe('parseDateRange', () => {
  it('builds an inclusive UTC range', () => {
    expect(parseDateRange('2026-07-01', '2026-07-31')).toEqual({
      gte: new Date('2026-07-01T00:00:00.000Z'),
      lte: new Date('2026-07-31T23:59:59.999Z'),
    });
  });

  it('allows an open-ended range and ignores invalid/empty inputs', () => {
    expect(parseDateRange('2026-07-01', undefined)).toEqual({ gte: new Date('2026-07-01T00:00:00.000Z') });
    expect(parseDateRange(undefined, undefined)).toEqual({});
    expect(parseDateRange('nope', '')).toEqual({});
  });
});
