import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder } from './orders';
import { createPromo, deletePromo, previewPromo, setPromoActive } from './promos';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE reservations, waitlist_entries, customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, points_ledger, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture(taxed = false) {
  const r = await db.restaurant.create({
    data: taxed
      ? { name: 'Bella', slug: 'bella', taxEnabled: true, taxRatePercent: '13.0000' }
      : { name: 'Bella', slug: 'bella' },
  });
  const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
  const item = await db.menuItem.create({
    data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
  });
  return { r, item };
}

const now = new Date('2026-07-16T12:00:00Z');

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('promo CRUD + preview', () => {
  it('creates a promo (uppercased) and rejects a duplicate; toggles + deletes it', async () => {
    const { r } = await fixture();
    const created = await createPromo(db, r.id, { code: 'save10', kind: 'PERCENT', value: 10 });
    expect(created.ok).toBe(true);

    const row = await db.promoCode.findFirstOrThrow({ where: { restaurantId: r.id } });
    expect(row.code).toBe('SAVE10');

    expect(await createPromo(db, r.id, { code: 'SAVE10', kind: 'AMOUNT', value: 5 })).toEqual({ ok: false, reason: 'duplicate' });

    expect((await setPromoActive(db, r.id, row.id, false)).count).toBe(1);
    expect((await db.promoCode.findUniqueOrThrow({ where: { id: row.id } })).active).toBe(false);

    expect((await deletePromo(db, r.id, row.id)).count).toBe(1);
    expect(await db.promoCode.count({ where: { restaurantId: r.id } })).toBe(0);
  });

  it('previews a valid code and reports why an invalid one fails', async () => {
    const { r } = await fixture();
    await createPromo(db, r.id, { code: 'TENOFF', kind: 'PERCENT', value: 10 });

    expect(await previewPromo(db, r.id, 'tenoff', 40, now)).toEqual({
      ok: true,
      code: 'TENOFF',
      kind: 'PERCENT',
      value: 10,
      discount: 4,
    });

    expect(await previewPromo(db, r.id, 'nope', 40, now)).toEqual({ ok: false, reason: 'not_found' });

    await createPromo(db, r.id, { code: 'GONE', kind: 'AMOUNT', value: 5, expiresAt: new Date('2026-07-15T00:00:00Z') });
    expect(await previewPromo(db, r.id, 'GONE', 40, now)).toEqual({ ok: false, reason: 'expired' });
  });
});

describe('promo redemption at order placement', () => {
  it('applies a percentage promo pre-tax and taxes the discounted base, incrementing usedCount', async () => {
    const { r, item } = await fixture(true); // 13% tax
    await createPromo(db, r.id, { code: 'SAVE10', kind: 'PERCENT', value: 10, maxUses: 2 });

    // subtotal 20, discount 2 → base 18, tax 13% = 2.34, total 20.34.
    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 2 }],
      { promoCode: 'save10' },
    );
    if (!placed.ok) throw new Error('expected ok');
    expect(placed).toMatchObject({ subtotal: 20, discount: 2, taxAmount: 2.34, total: 20.34 });

    const order = await db.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(Number(order.discountAmount)).toBe(2);
    expect(order.promoCode).toBe('SAVE10');
    expect(Number(order.subtotal)).toBe(20);
    expect(Number(order.total)).toBe(20.34);

    expect((await db.promoCode.findFirstOrThrow({ where: { restaurantId: r.id } })).usedCount).toBe(1);
  });

  it('ignores an inactive or unknown promo (no discount, no redemption)', async () => {
    const { r, item } = await fixture();
    const created = await createPromo(db, r.id, { code: 'OFF', kind: 'AMOUNT', value: 5 });
    if (!created.ok) throw new Error('expected ok');
    await setPromoActive(db, r.id, created.id, false);

    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 1 }],
      { promoCode: 'OFF' },
    );
    if (!placed.ok) throw new Error('expected ok');
    expect(placed.discount).toBe(0);
    expect(placed.total).toBe(10);
    expect((await db.promoCode.findUniqueOrThrow({ where: { id: created.id } })).usedCount).toBe(0);

    // Unknown code is silently ignored too.
    const placed2 = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 1 }],
      { promoCode: 'BOGUS' },
    );
    if (!placed2.ok) throw new Error('expected ok');
    expect(placed2.discount).toBe(0);
  });
});
