import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { getOrderDetail } from '@/server/services/orders';
import { cancelOrderAction } from '@/server/actions/orders';
import { isTerminal } from '@/lib/orders';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TYPE_LABEL: Record<string, string> = { DINE_IN: 'Dine-in', PICKUP: 'Pickup', DELIVERY: 'Delivery' };
const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', CARD: 'Card', ONLINE: 'Online', OTHER: 'Other' };

function dateTime(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;
  const id = Number(orderId);

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant || !Number.isInteger(id)) notFound();

  const order = await getOrderDetail(db, restaurant.id, id);
  if (!order) notFound();

  const contactName = order.customer?.name ?? order.customerName ?? order.guestName;
  const contactPhone = order.customer?.phone ?? order.customerPhone;
  const contactEmail = order.customer?.email ?? order.guestEmail;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/r/${slug}/orders`} className="text-sm text-muted hover:text-foreground">
        ← Orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl tracking-tight text-foreground">Order #{order.id}</h1>
        <span className="rounded-full bg-clay/40 px-2.5 py-0.5 text-xs font-medium text-muted">{order.status.toLowerCase()}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {TYPE_LABEL[order.orderType] ?? order.orderType}
        {order.table ? ` · Table ${order.table.number}` : ''} · placed {dateTime(order.createdAt)}
        {order.requestedTime ? ` · ⏰ scheduled for ${dateTime(order.requestedTime)}` : ''}
      </p>

      {order.status === 'CANCELLED' && order.cancelReason ? (
        <p className="mt-2 text-sm text-ember-600">Cancelled: {order.cancelReason}</p>
      ) : null}

      {can(membership.role, 'order:advance') && !isTerminal(order.status) ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-ember-600">Cancel this order</summary>
          <form action={cancelOrderAction.bind(null, slug, order.id)} className="mt-2 flex gap-2">
            <Input name="reason" placeholder="Reason (optional)" className="max-w-xs" />
            <Button type="submit" variant="ghost" className="text-ember-600">Confirm cancel</Button>
          </form>
        </details>
      ) : null}

      {/* Customer */}
      {contactName || contactPhone || contactEmail ? (
        <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Customer</h2>
          <p className="mt-1 font-medium text-foreground">
            {order.customer ? (
              <Link href={`/r/${slug}/customers/${order.customer.id}`} className="hover:underline">
                {contactName ?? 'Customer'}
              </Link>
            ) : (
              (contactName ?? 'Guest')
            )}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-muted">
            {contactPhone ? <span>📞 {contactPhone}</span> : null}
            {contactEmail ? <span>✉️ {contactEmail}</span> : null}
          </p>
          {order.deliveryAddress ? <p className="mt-1 text-sm text-muted">📍 {order.deliveryAddress}</p> : null}
          {order.deliveryNotes ? <p className="text-sm text-muted">Note: {order.deliveryNotes}</p> : null}
        </section>
      ) : null}

      {/* Items */}
      <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Items</h2>
        <ul className="mt-3 space-y-3">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-foreground">
                  <span className="tabular-nums text-muted">{it.quantity}×</span> {it.menuItem.name}
                </p>
                {it.modifiers.length > 0 ? (
                  <p className="text-xs text-muted">{it.modifiers.map((m) => m.optionName).join(', ')}</p>
                ) : null}
                {it.notes ? <p className="text-xs italic text-muted">“{it.notes}”</p> : null}
              </div>
              <span className="shrink-0 tabular-nums text-foreground">{formatMoney(Number(it.unitPrice) * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="tabular-nums text-foreground">{formatMoney(Number(order.subtotal))}</span>
          </div>
          {Number(order.taxAmount) > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted">{restaurant.taxLabel} ({Number(order.taxRatePercent)}%)</span>
              <span className="tabular-nums text-foreground">{formatMoney(Number(order.taxAmount))}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-1 font-medium">
            <span className="text-foreground">Total</span>
            <span className="tabular-nums text-foreground">{formatMoney(Number(order.total))}</span>
          </div>
        </div>
      </section>

      {/* Delivery */}
      {order.delivery ? (
        <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5 text-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Delivery</h2>
          <p className="mt-1 text-foreground">
            {order.delivery.provider} · {order.delivery.status.toLowerCase()}
            {order.delivery.fee != null ? ` · ${formatMoney(Number(order.delivery.fee))}` : ''}
          </p>
          {order.delivery.trackingUrl ? (
            <a href={order.delivery.trackingUrl} target="_blank" rel="noreferrer" className="text-ember-600 underline">
              Track courier →
            </a>
          ) : null}
        </section>
      ) : null}

      {/* Payments */}
      {order.payments.length > 0 ? (
        <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5 text-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Payments</h2>
          <ul className="mt-2 space-y-1">
            {order.payments.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="text-muted">
                  {METHOD_LABEL[p.method] ?? p.method} · {p.status.toLowerCase()}
                  {p.transactionId ? ` · ${p.transactionId}` : ''}
                </span>
                <span className="tabular-nums text-foreground">{formatMoney(Number(p.amount))}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-4 text-xs text-muted">No payment recorded (pay on arrival / unsettled).</p>
      )}

      {order.notes ? (
        <p className="mt-4 text-sm text-muted">Order note: “{order.notes}”</p>
      ) : null}
    </div>
  );
}
