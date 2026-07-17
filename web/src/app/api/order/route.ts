import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { placeOnlineOrder, type Fulfillment } from '@/server/services/orders';
import { getOpeningHours } from '@/server/services/restaurants';
import { dispatchDelivery, quoteDelivery } from '@/server/services/deliveries';
import { createOrderCheckout } from '@/server/checkout';
import { isOnlinePaymentConfigured } from '@/server/stripe';
import { placeOnlineOrderSchema } from '@/lib/validation/order';
import { isOpenNow } from '@/lib/hours';
import { toCents } from '@/lib/format';

// Public storefront order placement (pickup or delivery). No table, no HMAC token —
// gated instead by the restaurant enabling online ordering and being open. Prices
// are always recomputed server-side; client-sent prices are ignored.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = placeOnlineOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
  const input = parsed.data;

  const restaurant = await db.restaurant.findUnique({ where: { slug: input.slug } });
  if (!restaurant) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!restaurant.onlineOrderingEnabled) {
    return NextResponse.json({ error: 'online ordering is unavailable' }, { status: 403 });
  }
  if (restaurant.ordersPaused) {
    return NextResponse.json({ error: 'not accepting orders right now' }, { status: 409 });
  }

  // A scheduled time can't be in the past.
  if (input.requestedTime && input.requestedTime.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: 'requested time is in the past' }, { status: 400 });
  }

  // The restaurant must be open at the fulfillment time (now, or the scheduled slot).
  const hours = await getOpeningHours(db, restaurant.id);
  const at = input.requestedTime ?? new Date();
  if (!isOpenNow(hours, at, restaurant.timezone)) {
    return NextResponse.json({ error: 'restaurant is closed' }, { status: 409 });
  }

  const fulfillment: Fulfillment =
    input.orderType === 'DELIVERY'
      ? {
          kind: 'delivery',
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress!,
          deliveryNotes: input.deliveryNotes,
          requestedTime: input.requestedTime,
        }
      : {
          kind: 'pickup',
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          requestedTime: input.requestedTime,
        };

  const result = await placeOnlineOrder(db, restaurant.id, fulfillment, input.items, {
    notes: input.notes,
    guestName: input.customerName,
    guestEmail: input.guestEmail,
    tip: input.tip,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Online payment (Stripe): create a Checkout Session and hand back its URL. The
  // courier is dispatched only after payment confirms (in the Stripe webhook), so
  // we never pay for delivery on an unpaid order.
  if (input.payOnline && isOnlinePaymentConfigured()) {
    let deliveryFeeCents = 0;
    if (input.orderType === 'DELIVERY') {
      const quote = await quoteDelivery(db, input.slug, input.deliveryAddress!);
      if (quote.ok) deliveryFeeCents = toCents(quote.quote.fee);
    }
    const checkout = await createOrderCheckout({
      slug: input.slug,
      orderId: result.orderId,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      subtotalCents: toCents(result.subtotal),
      taxCents: toCents(result.taxAmount),
      taxLabel: restaurant.taxLabel,
      tipCents: input.tip ? toCents(input.tip) : 0,
      deliveryFeeCents,
    });
    if (checkout) {
      return NextResponse.json(
        { ok: true, orderId: result.orderId, total: result.total, checkoutUrl: checkout.url },
        { status: 201 },
      );
    }
    // Fall through to pay-on-arrival if the session couldn't be created.
  }

  // Pay-on-arrival: dispatch a courier now for delivery orders (mock provider when
  // Uber isn't configured).
  let tracking: string | null = null;
  if (input.orderType === 'DELIVERY') {
    const dispatched = await dispatchDelivery(db, result.orderId);
    if (dispatched.ok) tracking = dispatched.trackingUrl;
  }

  return NextResponse.json(
    { ok: true, orderId: result.orderId, total: result.total, trackingUrl: tracking },
    { status: 201 },
  );
}
