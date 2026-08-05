import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import type { OrderListItem } from '@/server/services/orders';

const TYPE_LABEL: Record<string, string> = {
  DINE_IN: 'Dine-in',
  PICKUP: 'Pickup',
  DELIVERY: 'Delivery',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-clay/40 text-muted',
  CONFIRMED: 'bg-pine/10 text-pine dark:bg-linen/10 dark:text-linen',
  PREPARING: 'bg-ember/10 text-ember-600',
  READY: 'bg-ember/10 text-ember-600',
  DELIVERED: 'bg-pine/10 text-pine dark:bg-linen/10 dark:text-linen',
  CANCELLED: 'bg-clay/40 text-muted',
};

function when(o: OrderListItem): string {
  const d = o.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const t = o.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${d} · ${t}`;
}

export function OrderTable({
  orders,
  slug,
  showCustomer = false,
}: {
  orders: OrderListItem[];
  slug: string;
  showCustomer?: boolean;
}) {
  if (orders.length === 0) {
    return <p className="mt-6 text-sm text-muted">No orders here yet.</p>;
  }
  const cols = showCustomer
    ? 'sm:grid-cols-[1.4fr_1.3fr_1fr_1fr_auto_auto]'
    : 'sm:grid-cols-[1.4fr_1fr_1fr_auto_auto]';

  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      <div className={`hidden border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-muted sm:grid sm:gap-4 ${cols}`}>
        <span>When</span>
        {showCustomer ? <span>Customer</span> : null}
        <span>Type</span>
        <span>Status</span>
        <span className="text-right">Items</span>
        <span className="text-right">Total</span>
      </div>
      <ul className="divide-y divide-border">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/r/${slug}/orders/${o.id}`}
              className={`grid gap-1 px-4 py-3 transition-colors hover:bg-black/5 sm:items-center sm:gap-4 dark:hover:bg-white/5 ${cols}`}
            >
              <span className="text-foreground">
                {when(o)}
                {o.requestedTime ? (
                  <span className="ml-1.5 rounded-full bg-ember/10 px-1.5 py-0.5 text-[0.65rem] text-ember-600">⏰ scheduled</span>
                ) : null}
              </span>
              {showCustomer ? (
                <span className="truncate text-muted">
                  {o.customerName ?? '—'}
                  {o.tableNumber != null ? ` · T${o.tableNumber}` : ''}
                </span>
              ) : null}
              <span className="text-muted">{TYPE_LABEL[o.orderType] ?? o.orderType}</span>
              <span>
                <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${STATUS_STYLE[o.status] ?? 'bg-clay/40 text-muted'}`}>
                  {o.status.toLowerCase()}
                </span>
              </span>
              <span className="tabular-nums text-muted sm:text-right">
                <span className="sm:hidden">Items: </span>
                {o.itemCount}
              </span>
              <span className="tabular-nums text-foreground sm:text-right">{formatMoney(o.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
