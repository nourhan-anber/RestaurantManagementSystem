import { isoDate, money, toCsv } from './csv';
import type { DayRevenue, RankRow } from './reports';

// Structural input shapes (satisfied by the report/service results) — keeps this
// pure lib independent of the service layer.

export interface OrderCsvRow {
  id: number;
  createdAt: Date;
  orderType: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  customerName: string | null;
  itemCount: number;
}

export function ordersCsv(rows: ReadonlyArray<OrderCsvRow>): string {
  return toCsv(
    ['id', 'date', 'type', 'status', 'subtotal', 'tax', 'total', 'customer', 'items'],
    rows.map((o) => [
      o.id,
      isoDate(o.createdAt),
      o.orderType,
      o.status,
      money(o.subtotal),
      money(o.taxAmount),
      money(o.total),
      o.customerName,
      o.itemCount,
    ]),
  );
}

export interface CustomerCsvRow {
  name: string | null;
  phone: string | null;
  email: string | null;
  orders: number;
  spend: number;
  lastOrderAt: Date | null;
  createdAt: Date;
}

export function customersCsv(rows: ReadonlyArray<CustomerCsvRow>): string {
  return toCsv(
    ['name', 'phone', 'email', 'orders', 'total_spend', 'last_order', 'first_seen'],
    rows.map((c) => [
      c.name,
      c.phone,
      c.email,
      c.orders,
      money(c.spend),
      c.lastOrderAt ? isoDate(c.lastOrderAt) : '',
      isoDate(c.createdAt),
    ]),
  );
}

export interface SummaryCsvInput {
  range: { from: string; to: string };
  summary: { revenue: number; taxCollected: number; orders: number; avgOrder: number; itemsSold: number };
  byDay: ReadonlyArray<DayRevenue>;
  byType: ReadonlyArray<{ orderType: string; orders: number; revenue: number; tax: number; total: number }>;
  byMethod: ReadonlyArray<{ method: string; count: number; amount: number; tax: number }>;
  topItems: ReadonlyArray<RankRow>;
  topCategories: ReadonlyArray<RankRow>;
  topCustomers: ReadonlyArray<{ name: string | null; orders: number; spend: number }>;
}

/** A single sectioned CSV: KPIs, by-day, by-type, by-method, top items/categories/customers. */
export function summaryCsv(input: SummaryCsvInput): string {
  const sections = [
    `Sales summary,${input.range.from} to ${input.range.to}\r\n`,
    toCsv(['metric', 'value'], [
      ['Net revenue', money(input.summary.revenue)],
      ['Tax collected', money(input.summary.taxCollected)],
      ['Orders', input.summary.orders],
      ['Avg order', money(input.summary.avgOrder)],
      ['Items sold', input.summary.itemsSold],
    ]),
    toCsv(
      ['day', 'orders', 'revenue', 'tax', 'total'],
      input.byDay.map((d) => [d.day, d.orders, money(d.revenue), money(d.tax), money(d.total)]),
    ),
    toCsv(
      ['order_type', 'orders', 'revenue', 'tax', 'total'],
      input.byType.map((t) => [t.orderType, t.orders, money(t.revenue), money(t.tax), money(t.total)]),
    ),
    toCsv(
      ['payment_method', 'count', 'amount', 'tax'],
      input.byMethod.map((m) => [m.method, m.count, money(m.amount), money(m.tax)]),
    ),
    toCsv(['top_item', 'quantity', 'revenue'], input.topItems.map((i) => [i.name, i.quantity, money(i.revenue)])),
    toCsv(['top_category', 'quantity', 'revenue'], input.topCategories.map((c) => [c.name, c.quantity, money(c.revenue)])),
    toCsv(['top_customer', 'orders', 'spend'], input.topCustomers.map((c) => [c.name, c.orders, money(c.spend)])),
  ];
  return sections.join('\r\n');
}
