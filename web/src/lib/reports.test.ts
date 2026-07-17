import { describe, expect, it } from 'vitest';
import { bucketRevenueByDay, percentOfMax, rankItemsAndCategories, safeAverage } from './reports';

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

describe('bucketRevenueByDay', () => {
  it('groups by restaurant-local day, sums, and sorts ascending', () => {
    const rows = [
      { createdAt: new Date('2026-07-17T16:00:00Z'), subtotal: 10, taxAmount: 1.3, total: 11.3 }, // Jul 17 EDT
      { createdAt: new Date('2026-07-17T18:00:00Z'), subtotal: 20, taxAmount: 2.6, total: 22.6 }, // Jul 17 EDT
      { createdAt: new Date('2026-07-17T02:00:00Z'), subtotal: 5, taxAmount: 0, total: 5 }, // Jul 16 EDT (22:00)
    ];
    const out = bucketRevenueByDay(rows, 'America/New_York');
    expect(out).toEqual([
      { day: '2026-07-16', revenue: 5, tax: 0, total: 5, orders: 1 },
      { day: '2026-07-17', revenue: 30, tax: 3.9, total: 33.9, orders: 2 },
    ]);
  });

  it('returns [] for no rows', () => {
    expect(bucketRevenueByDay([], 'UTC')).toEqual([]);
  });
});

describe('rankItemsAndCategories', () => {
  it('ranks by revenue (unitPrice × qty), aggregating categories', () => {
    const lines = [
      { name: 'Pizza', categoryName: 'Mains', quantity: 2, unitPrice: 18 }, // 36
      { name: 'Fries', categoryName: 'Sides', quantity: 5, unitPrice: 5 }, // 25
      { name: 'Pizza', categoryName: 'Mains', quantity: 1, unitPrice: 18 }, // +18 → 54
    ];
    const { items, categories } = rankItemsAndCategories(lines);
    expect(items).toEqual([
      { name: 'Pizza', quantity: 3, revenue: 54 },
      { name: 'Fries', quantity: 5, revenue: 25 },
    ]);
    expect(categories).toEqual([
      { name: 'Mains', quantity: 3, revenue: 54 },
      { name: 'Sides', quantity: 5, revenue: 25 },
    ]);
  });

  it('breaks revenue ties by quantity, then name', () => {
    const lines = [
      { name: 'Cola', categoryName: 'Drinks', quantity: 2, unitPrice: 5 }, // rev 10, qty 2
      { name: 'Water', categoryName: 'Drinks', quantity: 5, unitPrice: 2 }, // rev 10, qty 5 → wins on qty
      { name: 'Aioli', categoryName: 'Extras', quantity: 5, unitPrice: 2 }, // rev 10, qty 5 → tie with Water, name first
    ];
    const { items } = rankItemsAndCategories(lines);
    expect(items.map((i) => i.name)).toEqual(['Aioli', 'Water', 'Cola']);
  });
});
