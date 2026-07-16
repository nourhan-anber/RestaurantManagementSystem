'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cartCount, cartTotal } from '@/lib/cart';
import { formatMoney } from '@/lib/format';
import { useCart } from '@/stores/cart';

export interface CustomerMenuItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
}

type Status = 'idle' | 'placing' | 'success' | 'error';

export function CustomerMenu({
  restaurantName,
  slug,
  tableNumber,
  token,
  menu,
}: {
  restaurantName: string;
  slug: string;
  tableNumber: number;
  token: string;
  menu: CustomerMenuItem[];
}) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const decrement = useCart((s) => s.decrement);
  const clear = useCart((s) => s.clear);

  const categories = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);
  const [category, setCategory] = useState(categories[0] ?? '');
  const [cartOpen, setCartOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const count = cartCount(lines);
  const total = cartTotal(lines);
  const qtyOf = (id: number) => lines.find((l) => l.menuItemId === id)?.quantity ?? 0;

  async function placeOrder() {
    setStatus('placing');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          tableNumber,
          token,
          items: lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      if (!res.ok) throw new Error('failed');
      clear();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <div>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-pine text-2xl text-linen">✓</div>
          <h1 className="mt-5 font-display text-2xl text-foreground">Order placed</h1>
          <p className="mt-2 text-sm text-muted">
            Thanks! Your order is on its way to the kitchen for table {tableNumber}.
          </p>
          <Button className="mt-6" onClick={() => setStatus('idle')}>
            Order more
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">{restaurantName}</p>
          <p className="text-xs text-muted">Table {tableNumber}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setCartOpen(true)}>
          Cart{count > 0 ? ` · ${count}` : ''}
        </Button>
      </header>

      <div className="sticky top-[4.25rem] z-10 flex gap-2 overflow-x-auto border-b border-border bg-background px-5 py-3">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
              c === category ? 'bg-pine text-linen' : 'bg-surface text-muted hover:text-foreground'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-border">
        {menu
          .filter((m) => m.category === category)
          .map((item) => {
            const q = qtyOf(item.id);
            return (
              <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-sm text-muted">{item.description}</p>
                  ) : null}
                  <p className="mt-1 text-sm tabular-nums text-foreground">{formatMoney(item.price)}</p>
                </div>
                {q === 0 ? (
                  <Button size="sm" onClick={() => add({ menuItemId: item.id, name: item.name, price: item.price })}>
                    Add
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => decrement(item.id)}>
                      −
                    </Button>
                    <span className="w-5 text-center tabular-nums text-foreground">{q}</span>
                    <Button size="sm" variant="ghost" onClick={() => add({ menuItemId: item.id, name: item.name, price: item.price })}>
                      +
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
      </ul>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
          <Button className="w-full" size="lg" onClick={() => setCartOpen(true)}>
            View cart · {count} · {formatMoney(total)}
          </Button>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-30 flex">
          <button className="flex-1 bg-black/40" aria-label="Close cart" onClick={() => setCartOpen(false)} />
          <aside className="flex w-full max-w-sm flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg text-foreground">Your order</h2>
              <button onClick={() => setCartOpen(false)} className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lines.length === 0 ? (
                <p className="text-sm text-muted">Your cart is empty.</p>
              ) : (
                <ul className="space-y-4">
                  {lines.map((l) => (
                    <li key={l.menuItemId} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                        <p className="text-xs text-muted">{formatMoney(l.price)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => decrement(l.menuItemId)}>−</Button>
                        <span className="w-5 text-center tabular-nums text-foreground">{l.quantity}</span>
                        <Button size="sm" variant="ghost" onClick={() => add({ menuItemId: l.menuItemId, name: l.name, price: l.price })}>+</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 border-t border-border px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total</span>
                <span className="font-medium tabular-nums text-foreground">{formatMoney(total)}</span>
              </div>
              {status === 'error' ? (
                <p role="alert" className="text-sm text-ember-600">
                  Something went wrong. Please try again.
                </p>
              ) : null}
              <Button
                className="w-full"
                size="lg"
                disabled={lines.length === 0 || status === 'placing'}
                onClick={placeOrder}
              >
                {status === 'placing' ? 'Placing…' : 'Place order'}
              </Button>
              <p className="text-center text-xs text-muted">Pay at the table when you&rsquo;re done.</p>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
