import type { PrismaClient } from '@/generated/prisma/client';
import type { OrderType, PaymentMethod } from '@/generated/prisma/enums';
import { rankItemsAndCategories, safeAverage } from '@/lib/reports';

export interface DateRange {
  gte?: Date;
  lte?: Date;
}

function createdAtFilter(range?: DateRange) {
  if (!range || (!range.gte && !range.lte)) return {};
  return { createdAt: { ...(range.gte ? { gte: range.gte } : {}), ...(range.lte ? { lte: range.lte } : {}) } };
}

/** Where clause for settled (delivered) orders, tenant-scoped and optionally ranged. */
function deliveredWhere(restaurantId: number, range?: DateRange) {
  return { restaurantId, status: 'DELIVERED' as const, ...createdAtFilter(range) };
}

export interface SalesSummary {
  revenue: number; // net of tax
  taxCollected: number;
  orders: number;
  avgOrder: number;
  itemsSold: number;
}

/** Revenue/tax/orders/items from settled (delivered) orders in the range. */
export async function salesSummary(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
): Promise<SalesSummary> {
  const where = deliveredWhere(restaurantId, range);
  const [orderAgg, itemAgg] = await Promise.all([
    db.order.aggregate({ where, _sum: { subtotal: true, taxAmount: true }, _count: { _all: true } }),
    db.orderItem.aggregate({ where: { order: where }, _sum: { quantity: true } }),
  ]);

  const revenue = Number(orderAgg._sum.subtotal ?? 0);
  const taxCollected = Number(orderAgg._sum.taxAmount ?? 0);
  const orders = orderAgg._count._all;
  return {
    revenue,
    taxCollected,
    orders,
    avgOrder: safeAverage(revenue, orders),
    itemsSold: itemAgg._sum.quantity ?? 0,
  };
}

export interface RevenueRow {
  createdAt: Date;
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** Raw delivered-order rows for time-series bucketing (see lib/reports.bucketRevenueByDay). */
export async function revenueRows(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
): Promise<RevenueRow[]> {
  const rows = await db.order.findMany({
    where: deliveredWhere(restaurantId, range),
    select: { createdAt: true, subtotal: true, taxAmount: true, total: true },
  });
  return rows.map((r) => ({
    createdAt: r.createdAt,
    subtotal: Number(r.subtotal),
    taxAmount: Number(r.taxAmount),
    total: Number(r.total),
  }));
}

export interface TypeBreakdown {
  orderType: OrderType;
  orders: number;
  revenue: number;
  tax: number;
  total: number;
}

/** Delivered sales split by fulfillment type. */
export async function salesByType(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
): Promise<TypeBreakdown[]> {
  const grouped = await db.order.groupBy({
    by: ['orderType'],
    where: deliveredWhere(restaurantId, range),
    _sum: { subtotal: true, taxAmount: true, total: true },
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({
      orderType: g.orderType,
      orders: g._count._all,
      revenue: Number(g._sum.subtotal ?? 0),
      tax: Number(g._sum.taxAmount ?? 0),
      total: Number(g._sum.total ?? 0),
    }))
    .sort((a, b) => b.total - a.total);
}

export interface MethodBreakdown {
  method: PaymentMethod;
  count: number;
  amount: number; // gross collected
  refunded: number;
  net: number; // amount − refunded
  tax: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Payments collected (settlement-time) split by method, net of refunds. Includes
 * both SUCCEEDED and REFUNDED rows so a fully-refunded payment still nets to zero
 * rather than vanishing from the breakdown.
 */
export async function salesByPaymentMethod(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
): Promise<MethodBreakdown[]> {
  const grouped = await db.payment.groupBy({
    by: ['method'],
    where: { restaurantId, status: { in: ['SUCCEEDED', 'REFUNDED'] }, ...createdAtFilter(range) },
    _sum: { amount: true, taxAmount: true, refundedAmount: true },
    _count: { _all: true },
  });
  return grouped
    .map((g) => {
      const amount = Number(g._sum.amount ?? 0);
      const refunded = Number(g._sum.refundedAmount ?? 0);
      return {
        method: g.method,
        count: g._count._all,
        amount,
        refunded,
        net: round2(amount - refunded),
        tax: Number(g._sum.taxAmount ?? 0),
      };
    })
    .sort((a, b) => b.net - a.net);
}

/** Total refunded (settlement-time) in the range — for a "Refunds" reporting line. */
export async function refundsTotal(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
): Promise<number> {
  const agg = await db.payment.aggregate({
    where: { restaurantId, ...createdAtFilter(range) },
    _sum: { refundedAmount: true },
  });
  return Number(agg._sum.refundedAmount ?? 0);
}

/** Total tips collected (over SUCCEEDED/REFUNDED payments) in the range. */
export async function tipsTotal(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
): Promise<number> {
  const agg = await db.payment.aggregate({
    where: { restaurantId, status: { in: ['SUCCEEDED', 'REFUNDED'] }, ...createdAtFilter(range) },
    _sum: { tipAmount: true },
  });
  return Number(agg._sum.tipAmount ?? 0);
}

/** Total discounts/comps given across settled (delivered) orders in the range. */
export async function discountsTotal(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
): Promise<number> {
  const agg = await db.order.aggregate({
    where: deliveredWhere(restaurantId, range),
    _sum: { discountAmount: true },
  });
  return Number(agg._sum.discountAmount ?? 0);
}

/** Revenue-ranked top menu items and categories over delivered orders in the range. */
export async function topItemsAndCategories(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
  limit = 5,
) {
  const lines = await db.orderItem.findMany({
    where: { order: deliveredWhere(restaurantId, range) },
    select: {
      quantity: true,
      unitPrice: true,
      menuItem: { select: { name: true, category: { select: { name: true } } } },
    },
  });
  const { items, categories } = rankItemsAndCategories(
    lines.map((l) => ({
      name: l.menuItem.name,
      categoryName: l.menuItem.category.name,
      quantity: l.quantity,
      unitPrice: Number(l.unitPrice),
    })),
  );
  return { items: items.slice(0, limit), categories: categories.slice(0, limit) };
}

export interface TopCustomer {
  id: number;
  name: string | null;
  phone: string | null;
  orders: number;
  spend: number;
}

/** Top customers by total spend over delivered orders in the range. */
export async function topCustomers(
  db: PrismaClient,
  restaurantId: number,
  range?: DateRange,
  limit = 5,
): Promise<TopCustomer[]> {
  const grouped = await db.order.groupBy({
    by: ['customerId'],
    where: { ...deliveredWhere(restaurantId, range), customerId: { not: null } },
    _sum: { total: true },
    _count: { _all: true },
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });
  const ids = grouped.map((g) => g.customerId).filter((x): x is number => x != null);
  const customers = await db.customer.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, phone: true },
  });
  const byId = new Map(customers.map((c) => [c.id, c]));
  return grouped.map((g) => ({
    id: g.customerId as number,
    name: byId.get(g.customerId as number)?.name ?? null,
    phone: byId.get(g.customerId as number)?.phone ?? null,
    orders: g._count._all,
    spend: Number(g._sum.total ?? 0),
  }));
}

export interface CustomerExportRow {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  orders: number;
  spend: number; // lifetime, all statuses
  lastOrderAt: Date | null;
  createdAt: Date;
}

/** Every customer with lifetime order count, total spend, and last order — for CSV export. */
export async function customerExportRows(
  db: PrismaClient,
  restaurantId: number,
): Promise<CustomerExportRow[]> {
  const [customers, grouped] = await Promise.all([
    db.customer.findMany({
      where: { restaurantId },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    }),
    db.order.groupBy({
      by: ['customerId'],
      where: { restaurantId, customerId: { not: null } },
      _sum: { total: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);
  const stats = new Map(grouped.map((g) => [g.customerId, g]));
  return customers
    .map((c) => {
      const s = stats.get(c.id);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        orders: s?._count._all ?? 0,
        spend: Number(s?._sum.total ?? 0),
        lastOrderAt: s?._max.createdAt ?? null,
        createdAt: c.createdAt,
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

export interface TopItem {
  name: string;
  quantity: number;
}

/** Best-selling menu items by quantity across settled orders (legacy; kept for tests). */
export async function topItems(db: PrismaClient, restaurantId: number, limit = 5): Promise<TopItem[]> {
  const grouped = await db.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: { restaurantId, status: 'DELIVERED' } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });
  const names = await db.menuItem.findMany({
    where: { id: { in: grouped.map((g) => g.menuItemId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(names.map((n) => [n.id, n.name]));
  return grouped.map((g) => ({
    name: nameById.get(g.menuItemId) ?? 'Unknown',
    quantity: g._sum.quantity ?? 0,
  }));
}
