import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { previewPromo } from '@/server/services/promos';

const previewSchema = z.object({
  slug: z.string().min(1),
  code: z.string().trim().min(1).max(60),
  subtotal: z.number().nonnegative().max(1_000_000),
});

// Public storefront promo-code preview: validate a code against the cart subtotal and
// return the discount it would apply. Redemption happens later, at order placement.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const restaurant = await db.restaurant.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (!restaurant) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const result = await previewPromo(db, restaurant.id, parsed.data.code, parsed.data.subtotal, new Date());
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 422 });

  return NextResponse.json({
    ok: true,
    code: result.code,
    kind: result.kind,
    value: result.value,
    discount: result.discount,
  });
}
