import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { quoteDelivery } from '@/server/services/deliveries';

const quoteSchema = z.object({
  slug: z.string().min(1),
  dropoff: z.string().trim().min(1).max(300),
});

// Public courier quote for the storefront checkout (delivery fee + ETA).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const result = await quoteDelivery(db, parsed.data.slug, parsed.data.dropoff);
  if (!result.ok) {
    const status = result.reason === 'not_found' ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, ...result.quote });
}
