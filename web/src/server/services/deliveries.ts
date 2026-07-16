import type { PrismaClient } from '@/generated/prisma/client';
import type { DeliveryStatus } from '@/generated/prisma/enums';
import { isTerminalDeliveryStatus } from '@/lib/delivery';
import { getDeliveryProvider, type DeliveryQuote } from '@/server/delivery';

export type QuoteResult =
  | { ok: true; quote: DeliveryQuote }
  | { ok: false; reason: 'not_found' | 'no_pickup_address' };

/** A courier quote for a dropoff, using the restaurant's address as pickup. */
export async function quoteDelivery(
  db: PrismaClient,
  slug: string,
  dropoff: string,
): Promise<QuoteResult> {
  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return { ok: false, reason: 'not_found' };
  if (!restaurant.address) return { ok: false, reason: 'no_pickup_address' };

  const quote = await getDeliveryProvider().quote({ pickup: restaurant.address, dropoff });
  return { ok: true, quote };
}

export type DispatchResult =
  | { ok: true; deliveryId: string; trackingUrl: string; status: DeliveryStatus }
  | { ok: false; reason: 'not_found' | 'not_delivery' | 'no_pickup_address' };

/**
 * Dispatch a courier for a placed DELIVERY order and record a linked Delivery.
 * Called outside placeOrderCore (after the order exists). Idempotent per order —
 * the Delivery row is unique on orderId, so a re-dispatch updates it in place.
 */
export async function dispatchDelivery(
  db: PrismaClient,
  orderId: number,
): Promise<DispatchResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { restaurant: { select: { name: true, address: true, phone: true } } },
  });
  if (!order) return { ok: false, reason: 'not_found' };
  if (order.orderType !== 'DELIVERY' || !order.deliveryAddress) {
    return { ok: false, reason: 'not_delivery' };
  }
  const pickup = order.restaurant.address;
  if (!pickup) return { ok: false, reason: 'no_pickup_address' };

  const provider = getDeliveryProvider();
  const quote = await provider.quote({ pickup, dropoff: order.deliveryAddress });
  const dispatch = await provider.createDelivery({
    orderId,
    pickup,
    dropoff: order.deliveryAddress,
    customerName: order.customerName ?? order.guestName ?? 'Customer',
    customerPhone: order.customerPhone ?? '',
    pickupName: order.restaurant.name,
    pickupPhone: order.restaurant.phone ?? '',
    quoteId: quote.quoteId,
  });

  const delivery = await db.delivery.upsert({
    where: { orderId },
    create: {
      orderId,
      provider: provider.name,
      externalId: dispatch.externalId,
      quoteId: quote.quoteId,
      status: dispatch.status,
      trackingUrl: dispatch.trackingUrl,
      fee: quote.fee,
      currency: quote.currency,
    },
    update: {
      provider: provider.name,
      externalId: dispatch.externalId,
      quoteId: quote.quoteId,
      status: dispatch.status,
      trackingUrl: dispatch.trackingUrl,
      fee: quote.fee,
      currency: quote.currency,
    },
  });

  return {
    ok: true,
    deliveryId: delivery.id,
    trackingUrl: dispatch.trackingUrl,
    status: dispatch.status,
  };
}

export type DeliveryUpdateResult =
  | { ok: true; changed: boolean; status: DeliveryStatus }
  | { ok: false; reason: 'not_found' };

/**
 * Apply a courier status update (from a webhook). Idempotent: a terminal delivery
 * ignores further updates. When the courier reports the order dropped off, the
 * order itself is marked DELIVERED (online orders have no table, so no trigger).
 */
export async function applyDeliveryUpdate(
  db: PrismaClient,
  input: { provider: string; externalId: string; status: DeliveryStatus },
): Promise<DeliveryUpdateResult> {
  const delivery = await db.delivery.findFirst({
    where: { provider: input.provider, externalId: input.externalId },
  });
  if (!delivery) return { ok: false, reason: 'not_found' };

  if (isTerminalDeliveryStatus(delivery.status)) {
    return { ok: true, changed: false, status: delivery.status };
  }

  await db.$transaction(async (tx) => {
    await tx.delivery.update({ where: { id: delivery.id }, data: { status: input.status } });
    if (input.status === 'DROPPED_OFF') {
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED' } });
    }
  });

  return { ok: true, changed: true, status: input.status };
}
