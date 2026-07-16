import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { placeOnlineOrder, type Fulfillment } from '@/server/services/orders';
import { getOpeningHours } from '@/server/services/restaurants';
import { dispatchDelivery } from '@/server/services/deliveries';
import { placeOnlineOrderSchema } from '@/lib/validation/order';
import { isOpenNow } from '@/lib/hours';

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
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Dispatch a courier for delivery orders (mock provider when Uber isn't configured).
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
