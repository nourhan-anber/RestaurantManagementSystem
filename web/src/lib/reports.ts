import { localDayKey } from './datetime';

/** Percentage of the max, for horizontal bar widths (0 when max is 0). */
export function percentOfMax(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}

/** Average that is 0 (not NaN) when count is 0. */
export function safeAverage(total: number, count: number): number {
  return count > 0 ? total / count : 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface DayRevenue {
  day: string; // 'YYYY-MM-DD' (restaurant-local)
  revenue: number; // net of tax
  tax: number;
  total: number; // gross
  orders: number;
}

/** Bucket order rows into per-(restaurant-local-)day revenue, sorted ascending. */
export function bucketRevenueByDay(
  rows: ReadonlyArray<{ createdAt: Date; subtotal: number; taxAmount: number; total: number }>,
  timeZone: string,
): DayRevenue[] {
  const byDay = new Map<string, DayRevenue>();
  for (const r of rows) {
    const day = localDayKey(r.createdAt, timeZone);
    const cur = byDay.get(day) ?? { day, revenue: 0, tax: 0, total: 0, orders: 0 };
    cur.revenue = round2(cur.revenue + r.subtotal);
    cur.tax = round2(cur.tax + r.taxAmount);
    cur.total = round2(cur.total + r.total);
    cur.orders += 1;
    byDay.set(day, cur);
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export interface RankRow {
  name: string;
  quantity: number;
  revenue: number;
}

/**
 * Aggregate order lines into revenue-ranked menu items and categories.
 * Revenue is unitPrice × quantity; ties break on quantity then name.
 */
export function rankItemsAndCategories(
  lines: ReadonlyArray<{ name: string; categoryName: string; quantity: number; unitPrice: number }>,
): { items: RankRow[]; categories: RankRow[] } {
  const items = new Map<string, RankRow>();
  const categories = new Map<string, RankRow>();
  const add = (map: Map<string, RankRow>, name: string, quantity: number, revenue: number) => {
    const cur = map.get(name) ?? { name, quantity: 0, revenue: 0 };
    cur.quantity += quantity;
    cur.revenue = round2(cur.revenue + revenue);
    map.set(name, cur);
  };
  for (const l of lines) {
    const revenue = l.unitPrice * l.quantity;
    add(items, l.name, l.quantity, revenue);
    add(categories, l.categoryName, l.quantity, revenue);
  }
  const byRevenue = (a: RankRow, b: RankRow) =>
    b.revenue - a.revenue || b.quantity - a.quantity || a.name.localeCompare(b.name);
  return {
    items: [...items.values()].sort(byRevenue),
    categories: [...categories.values()].sort(byRevenue),
  };
}
