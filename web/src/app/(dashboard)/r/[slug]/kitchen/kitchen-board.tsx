'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { nextKitchenStatus } from '@/lib/orders';
import { advanceOrder } from '@/server/actions/orders';

export interface KdsItem {
  id: number;
  name: string;
  quantity: number;
  notes: string | null;
  modifiers: string[];
}
export interface KdsOrder {
  id: number;
  status: 'PENDING' | 'PREPARING' | 'READY';
  notes: string | null;
  guestName: string | null;
  createdAt: string;
  tableNumber: number | null;
  orderType: 'DINE_IN' | 'PICKUP' | 'DELIVERY';
  items: KdsItem[];
}

function orderLabel(o: KdsOrder): string {
  if (o.tableNumber != null) return `Table ${o.tableNumber}`;
  return o.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup';
}

const COLUMNS = [
  { status: 'PENDING', label: 'New', cta: 'Start' },
  { status: 'PREPARING', label: 'In progress', cta: 'Mark ready' },
  { status: 'READY', label: 'Ready', cta: 'Mark served' },
] as const;

async function fetchOrders(slug: string): Promise<KdsOrder[]> {
  const res = await fetch(`/r/${slug}/kitchen/orders`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load orders');
  return (await res.json()).orders as KdsOrder[];
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`;
}

export function KitchenBoard({ slug, initialOrders }: { slug: string; initialOrders: KdsOrder[] }) {
  const qc = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ['kds', slug],
    queryFn: () => fetchOrders(slug),
    refetchInterval: 5000,
    initialData: initialOrders,
  });
  const [busy, setBusy] = useState<number | null>(null);

  async function advance(order: KdsOrder) {
    const next = nextKitchenStatus(order.status);
    if (!next) return;
    setBusy(order.id);
    try {
      await advanceOrder(slug, order.id, next);
      await qc.invalidateQueries({ queryKey: ['kds', slug] });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
            ← Overview
          </Link>
          <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Kitchen</h1>
        </div>
        <span className="text-xs text-muted">Live · updates every 5s</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status}>
              <h2 className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted">
                {col.label}
                <span>{list.length}</span>
              </h2>
              <div className="mt-2 space-y-3">
                {list.length === 0 ? (
                  <p className="rounded-[var(--radius)] border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                    Nothing here
                  </p>
                ) : null}
                {list.map((o) => (
                  <div key={o.id} className="rounded-[var(--radius)] border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-lg text-foreground">
                        {orderLabel(o)}
                        {o.guestName ? <span className="ml-1.5 text-sm font-normal text-muted">· {o.guestName}</span> : null}
                      </span>
                      <span className="text-xs text-muted">{timeAgo(o.createdAt)}</span>
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                      {o.items.map((it) => (
                        <li key={it.id}>
                          <div>
                            <span className="tabular-nums text-muted">{it.quantity}×</span> {it.name}
                          </div>
                          {it.modifiers.length > 0 ? (
                            <div className="pl-5 text-xs text-muted">{it.modifiers.join(', ')}</div>
                          ) : null}
                          {it.notes ? <div className="pl-5 text-xs text-ember-600">“{it.notes}”</div> : null}
                        </li>
                      ))}
                    </ul>
                    {o.notes ? <p className="mt-2 text-xs text-muted">Note: {o.notes}</p> : null}
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      disabled={busy === o.id}
                      onClick={() => advance(o)}
                    >
                      {busy === o.id ? '…' : col.cta}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
