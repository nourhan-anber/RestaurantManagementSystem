import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder } from './orders';
import { applyDeliveryUpdate, dispatchDelivery, quoteDelivery } from './deliveries';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture(address: string | null = '1 Pickup Plaza') {
  const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella', address } });
  const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
  const item = await db.menuItem.create({
    data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
  });
  return { r, item };
}

async function placeDelivery(rId: number, itemId: number) {
  const res = await placeOnlineOrder(
    db,
    rId,
    { kind: 'delivery', customerName: 'Ada', customerPhone: '555-0101', deliveryAddress: '9 Dropoff Ln' },
    [{ menuItemId: itemId, quantity: 1 }],
  );
  if (!res.ok) throw new Error('expected ok');
  return res.orderId;
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('quoteDelivery', () => {
  it('returns a deterministic mock fee when the restaurant has a pickup address', async () => {
    const { r } = await fixture();
    const q = await quoteDelivery(db, r.slug, '9 Dropoff Ln');
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    expect(q.quote.fee).toBeGreaterThanOrEqual(4.99);
    expect(q.quote.currency).toBe('usd');
  });

  it('fails for an unknown slug or a restaurant without an address', async () => {
    expect(await quoteDelivery(db, 'nope', 'x')).toEqual({ ok: false, reason: 'not_found' });
    const { r } = await fixture(null);
    expect(await quoteDelivery(db, r.slug, 'x')).toEqual({ ok: false, reason: 'no_pickup_address' });
  });
});

describe('dispatchDelivery', () => {
  it('creates a linked Delivery for a delivery order via the mock courier', async () => {
    const { r, item } = await fixture();
    const orderId = await placeDelivery(r.id, item.id);

    const dispatched = await dispatchDelivery(db, orderId);
    expect(dispatched).toMatchObject({ ok: true, status: 'REQUESTED' });

    const delivery = await db.delivery.findUniqueOrThrow({ where: { orderId } });
    expect(delivery.provider).toBe('mock');
    expect(delivery.externalId).toBeTruthy();
    expect(delivery.trackingUrl).toContain('track.mock.local');
    expect(Number(delivery.fee)).toBeGreaterThanOrEqual(4.99);
  });

  it('is idempotent per order (re-dispatch updates the same row)', async () => {
    const { r, item } = await fixture();
    const orderId = await placeDelivery(r.id, item.id);
    await dispatchDelivery(db, orderId);
    await dispatchDelivery(db, orderId);
    expect(await db.delivery.count({ where: { orderId } })).toBe(1);
  });

  it('refuses non-delivery orders and missing pickup address', async () => {
    const { r, item } = await fixture(null);
    const orderId = await placeDelivery(r.id, item.id);
    expect(await dispatchDelivery(db, orderId)).toEqual({ ok: false, reason: 'no_pickup_address' });

    const pickup = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 1 }],
    );
    if (!pickup.ok) throw new Error('expected ok');
    expect(await dispatchDelivery(db, pickup.orderId)).toEqual({ ok: false, reason: 'not_delivery' });
  });
});

describe('applyDeliveryUpdate', () => {
  it('advances status and marks the order delivered on drop-off, idempotently', async () => {
    const { r, item } = await fixture();
    const orderId = await placeDelivery(r.id, item.id);
    await dispatchDelivery(db, orderId);
    const delivery = await db.delivery.findUniqueOrThrow({ where: { orderId } });
    const provider = delivery.provider;
    const externalId = delivery.externalId!;

    expect(await applyDeliveryUpdate(db, { provider, externalId, status: 'PICKED_UP' })).toMatchObject({
      ok: true,
      changed: true,
    });

    const dropped = await applyDeliveryUpdate(db, { provider, externalId, status: 'DROPPED_OFF' });
    expect(dropped).toMatchObject({ ok: true, changed: true });
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('DELIVERED');

    // A terminal delivery ignores further updates.
    const again = await applyDeliveryUpdate(db, { provider, externalId, status: 'FAILED' });
    expect(again).toEqual({ ok: true, changed: false, status: 'DROPPED_OFF' });

    expect(await applyDeliveryUpdate(db, { provider, externalId: 'ghost', status: 'PICKED_UP' })).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });
});
