import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getDeliveryProvider } from '@/server/delivery';
import { applyDeliveryUpdate } from '@/server/services/deliveries';
import { mapUberStatus } from '@/lib/delivery';

interface UberDeliveryEvent {
  delivery_id?: string;
  status?: string;
  data?: { id?: string; status?: string };
}

// Courier status webhook (Uber Direct in prod; the mock provider accepts all in dev).
export async function POST(req: Request) {
  const provider = getDeliveryProvider();
  const rawBody = await req.text();
  const signature = req.headers.get('x-uber-signature');

  if (!provider.verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  let event: UberDeliveryEvent;
  try {
    event = JSON.parse(rawBody) as UberDeliveryEvent;
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const externalId = event.delivery_id ?? event.data?.id;
  const rawStatus = event.status ?? event.data?.status;
  if (!externalId || !rawStatus) {
    return NextResponse.json({ received: true, ignored: 'missing fields' });
  }

  const status = mapUberStatus(rawStatus);
  if (!status) {
    return NextResponse.json({ received: true, ignored: 'unmapped status' });
  }

  await applyDeliveryUpdate(db, { provider: provider.name, externalId, status });
  return NextResponse.json({ received: true });
}
