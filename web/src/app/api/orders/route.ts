import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { verifyTableToken } from '@/server/table-token';
import { placeOrder } from '@/server/services/orders';
import { placeOrderSchema } from '@/lib/validation/order';

// Public, token-authenticated order placement (the customer QR cart). Auth is the
// per-table HMAC token, not a session.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
  const { slug, tableNumber, token, items, notes, guestName, guestEmail } = parsed.data;

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const table = await db.table.findFirst({
    where: { restaurantId: restaurant.id, number: tableNumber, isActive: true },
  });
  if (!table) return NextResponse.json({ error: 'table not found' }, { status: 404 });

  if (!verifyTableToken(restaurant.id, table.id, token)) {
    return NextResponse.json({ error: 'invalid token for this table' }, { status: 403 });
  }

  const result = await placeOrder(db, restaurant.id, table.id, items, { notes, guestName, guestEmail });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, orderId: result.orderId, total: result.total }, { status: 201 });
}
