'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cartCount, cartTotal, type CartLine, type CartSelectedOption } from '@/lib/cart';
import { DIETARY_LABELS } from '@/lib/dietary';
import { formatMoney } from '@/lib/format';
import { computeTax } from '@/lib/tax';
import { useCart } from '@/stores/cart';
import type { DietaryTag } from '@/generated/prisma/enums';
import { ItemCustomizer } from './item-customizer';

export interface CustomerOption {
  id: number;
  name: string;
  priceDelta: number;
}
export interface CustomerGroup {
  id: number;
  name: string;
  minSelect: number;
  maxSelect: number | null;
  options: CustomerOption[];
}
export interface CustomerMenuItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  dietaryTags: DietaryTag[];
  spiceLevel: number;
  groups: CustomerGroup[];
}

type Step = 'menu' | 'details';
type Status = 'idle' | 'placing' | 'success' | 'error';

export function CustomerMenu({
  restaurantName,
  slug,
  tableNumber,
  token,
  taxEnabled,
  taxRatePercent,
  taxLabel,
  menu,
}: {
  restaurantName: string;
  slug: string;
  tableNumber: number;
  token: string;
  taxEnabled: boolean;
  taxRatePercent: number;
  taxLabel: string;
  menu: CustomerMenuItem[];
}) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const decrement = useCart((s) => s.decrement);
  const clear = useCart((s) => s.clear);

  const categories = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);
  const [category, setCategory] = useState(categories[0] ?? '');
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [status, setStatus] = useState<Status>('idle');
  const [customizing, setCustomizing] = useState<CustomerMenuItem | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const count = cartCount(lines);
  const subtotal = cartTotal(lines);
  const { taxAmount, total } = computeTax(subtotal, taxRatePercent, taxEnabled);
  const inCart = (itemId: number) =>
    lines.filter((l) => l.menuItemId === itemId).reduce((s, l) => s + l.quantity, 0);

  function addItem(item: CustomerMenuItem) {
    if (item.groups.length > 0) {
      setCustomizing(item);
      return;
    }
    add({ menuItemId: item.id, name: item.name, basePrice: item.price });
  }
  function addCustomized(item: CustomerMenuItem, options: CartSelectedOption[], notes: string) {
    add({ menuItemId: item.id, name: item.name, basePrice: item.price, options, notes });
    setCustomizing(null);
  }
  function bump(line: CartLine) {
    add({
      menuItemId: line.menuItemId,
      name: line.name,
      basePrice: line.basePrice,
      options: line.options,
      notes: line.notes,
    });
  }

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
          guestName: guestName.trim() || undefined,
          guestEmail: guestEmail.trim() || undefined,
          notes: orderNote.trim() || undefined,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            notes: l.notes,
            optionIds: l.options.map((o) => o.optionId),
          })),
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
            Thanks{guestName.trim() ? `, ${guestName.trim()}` : ''}! It&rsquo;s on its way to the
            kitchen for table {tableNumber}.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setStatus('idle');
              setStep('menu');
              setCartOpen(false);
            }}
          >
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
            const q = inCart(item.id);
            return (
              <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.description ? <p className="mt-0.5 text-sm text-muted">{item.description}</p> : null}
                  <p className="mt-1 text-sm tabular-nums text-foreground">
                    {item.groups.length > 0 ? 'from ' : ''}
                    {formatMoney(item.price)}
                  </p>
                  {item.dietaryTags.length > 0 || item.spiceLevel > 0 ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {item.dietaryTags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-pine/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-pine dark:bg-linen/10 dark:text-linen"
                        >
                          {DIETARY_LABELS[t]}
                        </span>
                      ))}
                      {item.spiceLevel > 0 ? (
                        <span className="text-xs" title={`Spice ${item.spiceLevel}/3`}>
                          {'🌶️'.repeat(item.spiceLevel)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Button size="sm" onClick={() => addItem(item)}>
                    {item.groups.length > 0 ? 'Choose' : 'Add'}
                  </Button>
                  {q > 0 ? <span className="text-[0.7rem] text-muted">{q} in cart</span> : null}
                </div>
              </li>
            );
          })}
      </ul>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              setStep('menu');
              setCartOpen(true);
            }}
          >
            View cart · {count} · {formatMoney(total)}
          </Button>
        </div>
      ) : null}

      {customizing ? (
        <ItemCustomizer
          item={customizing}
          onClose={() => setCustomizing(null)}
          onAdd={(options, notes) => addCustomized(customizing, options, notes)}
        />
      ) : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-30 flex">
          <button className="flex-1 bg-black/40" aria-label="Close cart" onClick={() => setCartOpen(false)} />
          <aside className="flex w-full max-w-sm flex-col bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg text-foreground">
                {step === 'menu' ? 'Your order' : 'Almost there'}
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-muted hover:text-foreground">✕</button>
            </div>

            {step === 'menu' ? (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {lines.length === 0 ? (
                    <p className="text-sm text-muted">Your cart is empty.</p>
                  ) : (
                    <ul className="space-y-4">
                      {lines.map((l) => (
                        <li key={l.lineId} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                            {l.options.length > 0 ? (
                              <p className="text-xs text-muted">{l.options.map((o) => o.name).join(', ')}</p>
                            ) : null}
                            {l.notes ? <p className="text-xs italic text-muted">“{l.notes}”</p> : null}
                            <p className="text-xs tabular-nums text-muted">{formatMoney(l.unitPrice)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => decrement(l.lineId)}>−</Button>
                            <span className="w-5 text-center tabular-nums text-foreground">{l.quantity}</span>
                            <Button size="sm" variant="ghost" onClick={() => bump(l)}>+</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-3 border-t border-border px-5 py-4">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Subtotal</span>
                      <span className="tabular-nums text-foreground">{formatMoney(subtotal)}</span>
                    </div>
                    {taxAmount > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted">{taxLabel}</span>
                        <span className="tabular-nums text-foreground">{formatMoney(taxAmount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t border-border pt-1 font-medium">
                      <span className="text-foreground">Total</span>
                      <span className="tabular-nums text-foreground">{formatMoney(total)}</span>
                    </div>
                  </div>
                  <Button className="w-full" size="lg" disabled={lines.length === 0} onClick={() => setStep('details')}>
                    Continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="guestName">Your name (optional)</Label>
                    <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="So we can call your order" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guestEmail">Email (optional)</Label>
                    <Input id="guestEmail" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="For a receipt" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="orderNote">Note for the kitchen (optional)</Label>
                    <textarea
                      id="orderNote"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      rows={2}
                      placeholder="Allergies, timing, a celebration…"
                      className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30"
                    />
                  </div>
                  {status === 'error' ? (
                    <p role="alert" className="text-sm text-ember-600">Something went wrong. Please try again.</p>
                  ) : null}
                </div>
                <div className="space-y-3 border-t border-border px-5 py-4">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Subtotal</span>
                      <span className="tabular-nums text-foreground">{formatMoney(subtotal)}</span>
                    </div>
                    {taxAmount > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted">{taxLabel}</span>
                        <span className="tabular-nums text-foreground">{formatMoney(taxAmount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t border-border pt-1 font-medium">
                      <span className="text-foreground">Total</span>
                      <span className="tabular-nums text-foreground">{formatMoney(total)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={status === 'placing'}
                    onClick={placeOrder}
                  >
                    {status === 'placing' ? 'Placing…' : 'Place order'}
                  </Button>
                  <button className="w-full text-center text-xs text-muted hover:text-foreground" onClick={() => setStep('menu')}>
                    ← Back to cart
                  </button>
                  <p className="text-center text-xs text-muted">Pay at the table when you&rsquo;re done.</p>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
