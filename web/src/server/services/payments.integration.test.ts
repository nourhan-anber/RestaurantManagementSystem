import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder } from './orders';
import { recordOnlinePayment, refundPayment } from './payments';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE reservations, waitlist_entries, customers, deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, promo_codes, password_reset_tokens, points_ledger, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
  );
}

async function fixture() {
  const r = await db.restaurant.create({ data: { name: 'Bella', slug: 'bella', address: '1 Pickup Plaza' } });
  const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
  const item = await db.menuItem.create({
    data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
  });
  return { r, item };
}

beforeEach(reset);
afterAll(async () => {
  await db.$disconnect();
});

describe('recordOnlinePayment', () => {
  it('records an ONLINE SUCCEEDED payment for a pickup order (no dispatch)', async () => {
    const { r, item } = await fixture();
    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 2 }],
    );
    if (!placed.ok) throw new Error('expected ok');

    const res = await recordOnlinePayment(db, {
      orderId: placed.orderId,
      stripePaymentIntentId: 'pi_1',
      amountCents: 2000,
      currency: 'usd',
    });
    expect(res).toMatchObject({ ok: true, duplicate: false });

    const payment = await db.payment.findFirstOrThrow({ where: { orderId: placed.orderId } });
    expect(payment.method).toBe('ONLINE');
    expect(payment.status).toBe('SUCCEEDED');
    expect(Number(payment.amount)).toBe(20);
    expect(Number(payment.taxAmount)).toBe(0);
    expect(payment.stripePaymentIntentId).toBe('pi_1');
    expect(await db.delivery.count()).toBe(0);
  });

  it('records the order tax on the online payment', async () => {
    const r = await db.restaurant.create({
      data: { name: 'Taxed', slug: 'taxed', taxEnabled: true, taxRatePercent: '13.0000' },
    });
    const cat = await db.menuCategory.create({ data: { restaurantId: r.id, name: 'main', position: 0 } });
    const item = await db.menuItem.create({
      data: { restaurantId: r.id, categoryId: cat.id, name: 'Dish', price: '10.00' },
    });
    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 2 }],
    );
    if (!placed.ok) throw new Error('expected ok');
    expect(placed.taxAmount).toBe(2.6);

    // Stripe charged subtotal 20 + tax 2.60 = 22.60.
    await recordOnlinePayment(db, {
      orderId: placed.orderId,
      stripePaymentIntentId: 'pi_tax',
      amountCents: 2260,
      currency: 'usd',
    });
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: placed.orderId } });
    expect(Number(payment.amount)).toBe(22.6);
    expect(Number(payment.taxAmount)).toBe(2.6);
  });

  it('records the order tip on the online payment (total stays food+tax)', async () => {
    const { r, item } = await fixture();
    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 2 }],
      { tip: 3 },
    );
    if (!placed.ok) throw new Error('expected ok');
    const order = await db.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(Number(order.tipAmount)).toBe(3);
    expect(Number(order.total)).toBe(20);

    // Stripe charged subtotal 20 + tip 3 = 23.
    await recordOnlinePayment(db, {
      orderId: placed.orderId,
      stripePaymentIntentId: 'pi_tip',
      amountCents: 2300,
      currency: 'usd',
    });
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: placed.orderId } });
    expect(Number(payment.amount)).toBe(23);
    expect(Number(payment.tipAmount)).toBe(3);
  });

  it('dispatches the courier for a paid delivery order', async () => {
    const { r, item } = await fixture();
    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'delivery', customerName: 'Ada', customerPhone: '555-0101', deliveryAddress: '9 Dropoff Ln' },
      [{ menuItemId: item.id, quantity: 1 }],
    );
    if (!placed.ok) throw new Error('expected ok');

    await recordOnlinePayment(db, {
      orderId: placed.orderId,
      stripePaymentIntentId: 'pi_2',
      amountCents: 1500,
      currency: 'usd',
    });

    const delivery = await db.delivery.findUniqueOrThrow({ where: { orderId: placed.orderId } });
    expect(delivery.provider).toBe('mock');
    expect(delivery.status).toBe('REQUESTED');
  });

  it('is idempotent on the PaymentIntent id (no double charge or dispatch)', async () => {
    const { r, item } = await fixture();
    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'delivery', customerName: 'Ada', customerPhone: '555-0101', deliveryAddress: '9 Dropoff Ln' },
      [{ menuItemId: item.id, quantity: 1 }],
    );
    if (!placed.ok) throw new Error('expected ok');

    const first = await recordOnlinePayment(db, {
      orderId: placed.orderId,
      stripePaymentIntentId: 'pi_dup',
      amountCents: 1500,
      currency: 'usd',
    });
    const second = await recordOnlinePayment(db, {
      orderId: placed.orderId,
      stripePaymentIntentId: 'pi_dup',
      amountCents: 1500,
      currency: 'usd',
    });
    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(second).toMatchObject({ ok: true, duplicate: true, paymentId: first.ok ? first.paymentId : '' });
    expect(await db.payment.count()).toBe(1);
    expect(await db.delivery.count()).toBe(1);
  });

  it('reports a missing order', async () => {
    expect(
      await recordOnlinePayment(db, {
        orderId: 99999,
        stripePaymentIntentId: 'pi_x',
        amountCents: 100,
        currency: 'usd',
      }),
    ).toEqual({ ok: false, reason: 'order_not_found' });
  });
});

describe('refundPayment', () => {
  // Stripe is unconfigured under test, so every refund is a manual/cash void.
  async function paidOrder(amountCents = 2000) {
    const { r, item } = await fixture();
    const placed = await placeOnlineOrder(
      db,
      r.id,
      { kind: 'pickup', customerName: 'Sam', customerPhone: '555-0100' },
      [{ menuItemId: item.id, quantity: 2 }],
    );
    if (!placed.ok) throw new Error('expected ok');
    await recordOnlinePayment(db, {
      orderId: placed.orderId,
      stripePaymentIntentId: 'pi_ref',
      amountCents,
      currency: 'usd',
    });
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: placed.orderId } });
    return { r, payment };
  }

  it('fully refunds a payment and flips its status to REFUNDED', async () => {
    const { r, payment } = await paidOrder();
    const res = await refundPayment(db, r.id, payment.id, { reason: 'kitchen error' });
    expect(res).toMatchObject({ ok: true, refundAmount: 20, refundedTotal: 20, fullyRefunded: true, mode: 'manual' });

    const after = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(Number(after.refundedAmount)).toBe(20);
    expect(after.status).toBe('REFUNDED');
    expect(after.refundReason).toBe('kitchen error');
    expect(after.refundedAt).not.toBeNull();
  });

  it('accumulates partial refunds and only flips status once fully refunded', async () => {
    const { r, payment } = await paidOrder();

    const first = await refundPayment(db, r.id, payment.id, { amount: 5 });
    expect(first).toMatchObject({ ok: true, refundAmount: 5, refundedTotal: 5, fullyRefunded: false });
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCEEDED');

    const second = await refundPayment(db, r.id, payment.id); // remaining 15
    expect(second).toMatchObject({ ok: true, refundAmount: 15, refundedTotal: 20, fullyRefunded: true });
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('REFUNDED');
  });

  it('rejects over-refunding and a fully-refunded payment', async () => {
    const { r, payment } = await paidOrder();
    expect(await refundPayment(db, r.id, payment.id, { amount: 25 })).toEqual({ ok: false, reason: 'exceeds_remaining' });

    await refundPayment(db, r.id, payment.id); // full
    expect(await refundPayment(db, r.id, payment.id)).toEqual({ ok: false, reason: 'nothing_left' });
  });

  it('is tenant-scoped', async () => {
    const { payment } = await paidOrder();
    expect(await refundPayment(db, 9999, payment.id)).toEqual({ ok: false, reason: 'not_found' });
  });
});
