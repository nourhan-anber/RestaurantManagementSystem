import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getStripe } from '@/server/stripe';
import { applySubscription } from '@/server/services/billing';
import { mapStripeStatus } from '@/lib/subscription';

interface StripeSubscriptionLike {
  id: string;
  status: string;
  customer: string | { id: string } | null;
  metadata?: { restaurantId?: string };
  items?: { data?: Array<{ price?: { id?: string } }> };
  current_period_end?: number;
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'billing not configured' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature') ?? '';
  const payload = await req.text();

  let event: import('stripe').Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as unknown as StripeSubscriptionLike;
    const restaurantId = Number(sub.metadata?.restaurantId ?? 0);
    if (restaurantId) {
      await applySubscription(db, {
        restaurantId,
        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null),
        stripeSubscriptionId: sub.id,
        status: mapStripeStatus(sub.status),
        priceId: sub.items?.data?.[0]?.price?.id ?? null,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      });
    }
  }

  return NextResponse.json({ received: true });
}
