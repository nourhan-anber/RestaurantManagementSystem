import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { placeOnlineOrder } from './orders';
import { recordOnlinePayment } from './payments';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function reset() {
  await db.$executeRawUnsafe(
    'TRUNCATE deliveries, order_item_modifiers, order_items, modifier_options, modifier_groups, menu_categories, orders, menu_items, tables, memberships, staff_invites, subscriptions, payments, opening_hours, restaurants, users RESTART IDENTITY CASCADE',
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
    expect(payment.stripePaymentIntentId).toBe('pi_1');
    expect(await db.delivery.count()).toBe(0);
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
