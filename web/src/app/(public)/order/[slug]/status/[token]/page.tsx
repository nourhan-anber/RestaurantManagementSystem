import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { verifyOrderToken } from '@/server/order-token';
import { getPublicOrderStatus } from '@/server/services/orders';
import { isTerminal } from '@/lib/orders';
import { StatusPoller } from './status-poller';

export const metadata: Metadata = { title: 'Order status' };

const TYPE_LABEL: Record<string, string> = { DINE_IN: 'Dine-in', PICKUP: 'Pickup', DELIVERY: 'Delivery' };

// Customer-facing progress steps. CONFIRMED collapses into "Received".
const STEPS = [
  { key: 'received', label: 'Received', matches: ['PENDING', 'CONFIRMED'] },
  { key: 'preparing', label: 'Preparing', matches: ['PREPARING'] },
  { key: 'ready', label: 'Ready', matches: ['READY'] },
  { key: 'done', label: 'Completed', matches: ['DELIVERED'] },
] as const;

function currentStep(status: string): number {
  const idx = STEPS.findIndex((s) => (s.matches as readonly string[]).includes(status));
  return idx === -1 ? 0 : idx;
}

function dateTime(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const orderId = verifyOrderToken(token);
  if (orderId == null) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!restaurant) notFound();

  const order = await getPublicOrderStatus(db, restaurant.id, orderId);
  if (!order) notFound();

  const cancelled = order.status === 'CANCELLED';
  const step = currentStep(order.status);
  const done = isTerminal(order.status);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      {/* Poll for live updates while the order is still in progress. */}
      {!done ? <StatusPoller /> : null}

      <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">{restaurant.name}</p>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Order #{order.id}</h1>
      <p className="mt-1 text-sm text-muted">
        {TYPE_LABEL[order.orderType] ?? order.orderType} · placed {dateTime(order.createdAt)}
        {order.requestedTime ? ` · scheduled for ${dateTime(order.requestedTime)}` : ''}
      </p>

      {cancelled ? (
        <div className="mt-8 rounded-[var(--radius)] border border-ember/40 bg-ember/5 px-4 py-3 text-sm text-ember-600">
          This order was cancelled.
        </div>
      ) : (
        <ol className="mt-8 space-y-3">
          {STEPS.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'current' : 'todo';
            return (
              <li key={s.key} className="flex items-center gap-3">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs ${
                    state === 'done'
                      ? 'bg-pine text-linen'
                      : state === 'current'
                        ? 'bg-ember text-linen'
                        : 'bg-clay/30 text-muted'
                  }`}
                >
                  {state === 'done' ? '✓' : i + 1}
                </span>
                <span className={state === 'todo' ? 'text-muted' : 'text-foreground'}>{s.label}</span>
                {state === 'current' ? <span className="text-xs text-ember">· now</span> : null}
              </li>
            );
          })}
        </ol>
      )}

      {order.delivery?.trackingUrl ? (
        <a
          href={order.delivery.trackingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm font-medium text-ember-600 hover:underline"
        >
          Track your courier →
        </a>
      ) : null}

      <section className="mt-8 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Your order</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {order.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-foreground">
              <span className="tabular-nums text-muted">{it.quantity}×</span> {it.menuItem.name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
