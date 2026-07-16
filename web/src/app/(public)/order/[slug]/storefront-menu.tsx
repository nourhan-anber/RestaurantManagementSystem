'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cartCount, cartTotal, type CartLine, type CartSelectedOption } from '@/lib/cart';
import { DIETARY_LABELS } from '@/lib/dietary';
import { formatMoney } from '@/lib/format';
import { DAY_LABELS, minutesToHhmm, type DayHours } from '@/lib/hours';
import { useCart } from '@/stores/cart';
import { ItemCustomizer } from '../../dine/[slug]/[tableNumber]/item-customizer';
import type { CustomerMenuItem } from '../../dine/[slug]/[tableNumber]/customer-menu';

type OrderType = 'PICKUP' | 'DELIVERY';
type Step = 'menu' | 'fulfillment' | 'details' | 'payment';
type Status = 'idle' | 'quoting' | 'placing' | 'success' | 'error';

interface Quote {
  fee: number;
  etaMinutes: number;
}

export function StorefrontMenu({
  slug,
  restaurantName,
  description,
  logoUrl,
  phone,
  address,
  open,
  hours,
  canDeliver,
  onlinePayment,
  menu,
}: {
  slug: string;
  restaurantName: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  open: boolean;
  hours: DayHours[];
  canDeliver: boolean;
  onlinePayment: boolean;
  menu: CustomerMenuItem[];
}) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const decrement = useCart((s) => s.decrement);
  const clear = useCart((s) => s.clear);

  const categories = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);
  const [category, setCategory] = useState(categories[0] ?? '');
  const [cartOpen, setCartOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [status, setStatus] = useState<Status>('idle');
  const [customizing, setCustomizing] = useState<CustomerMenuItem | null>(null);

  const [orderType, setOrderType] = useState<OrderType>('PICKUP');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);

  const count = cartCount(lines);
  const subtotal = cartTotal(lines);
  const deliveryFee = orderType === 'DELIVERY' ? (quote?.fee ?? 0) : 0;
  const grandTotal = subtotal + deliveryFee;

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

  async function fetchQuote(): Promise<boolean> {
    setStatus('quoting');
    try {
      const res = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, dropoff: deliveryAddress.trim() }),
      });
      if (!res.ok) throw new Error('quote failed');
      const data = await res.json();
      setQuote({ fee: data.fee, etaMinutes: data.etaMinutes });
      setStatus('idle');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }

  // Fulfillment step is complete enough to advance.
  const fulfillmentReady =
    customerName.trim().length > 0 &&
    customerPhone.trim().length >= 5 &&
    (orderType === 'PICKUP' || deliveryAddress.trim().length > 0);

  async function goToDetails() {
    if (orderType === 'DELIVERY') {
      const ok = await fetchQuote();
      if (!ok) return;
    }
    setStep('details');
  }

  async function placeOrder() {
    setStatus('placing');
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          orderType,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          guestEmail: guestEmail.trim() || undefined,
          notes: orderNote.trim() || undefined,
          deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress.trim() : undefined,
          deliveryNotes: orderType === 'DELIVERY' ? deliveryNotes.trim() || undefined : undefined,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            notes: l.notes,
            optionIds: l.options.map((o) => o.optionId),
          })),
        }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setTrackingUrl(data.trackingUrl ?? null);
      clear();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  function resetCheckout() {
    setStatus('idle');
    setStep('menu');
    setCartOpen(false);
    setQuote(null);
  }

  if (status === 'success') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <div>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-pine text-2xl text-linen">✓</div>
          <h1 className="mt-5 font-display text-2xl text-foreground">Order placed</h1>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Thanks{customerName.trim() ? `, ${customerName.trim()}` : ''}! We&rsquo;ve sent your{' '}
            {orderType === 'DELIVERY' ? 'delivery' : 'pickup'} order to {restaurantName}.
          </p>
          {trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-medium text-ember underline"
            >
              Track your courier →
            </a>
          ) : null}
          <div className="mt-6">
            <Button onClick={resetCheckout}>Order again</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh pb-24">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-full object-cover"
                unoptimized
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-foreground">{restaurantName}</p>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                    open ? 'bg-pine/10 text-pine dark:bg-linen/10 dark:text-linen' : 'bg-ember/10 text-ember-600'
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${open ? 'bg-pine dark:bg-linen' : 'bg-ember'}`} />
                  {open ? 'Open now' : 'Closed'}
                </span>
                {hours.length > 0 ? (
                  <button className="text-muted underline hover:text-foreground" onClick={() => setHoursOpen((v) => !v)}>
                    Hours
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setCartOpen(true)}>
            Cart{count > 0 ? ` · ${count}` : ''}
          </Button>
        </div>

        {description || phone || address ? (
          <div className="px-5 pb-3 text-xs text-muted">
            {description ? <p className="text-foreground/80">{description}</p> : null}
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {address ? <span>📍 {address}</span> : null}
              {phone ? <span>📞 {phone}</span> : null}
            </p>
          </div>
        ) : null}

        {hoursOpen ? (
          <div className="border-t border-border px-5 py-3">
            <ul className="space-y-0.5 text-xs">
              {[...hours]
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                .map((h) => (
                  <li key={h.dayOfWeek} className="flex justify-between">
                    <span className="text-muted">{DAY_LABELS[h.dayOfWeek]}</span>
                    <span className="tabular-nums text-foreground">
                      {h.isClosed
                        ? 'Closed'
                        : `${minutesToHhmm(h.opensMinutes)} – ${minutesToHhmm(h.closesMinutes)}`}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </header>

      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-border bg-background px-5 py-3">
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
            View cart · {count} · {formatMoney(subtotal)}
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
                {step === 'menu' ? 'Your order' : step === 'fulfillment' ? 'How & where' : step === 'details' ? 'Your details' : 'Payment'}
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Subtotal</span>
                    <span className="font-medium tabular-nums text-foreground">{formatMoney(subtotal)}</span>
                  </div>
                  {!open ? (
                    <p role="alert" className="text-sm text-ember-600">
                      {restaurantName} is currently closed. You can browse, but ordering is paused.
                    </p>
                  ) : null}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={lines.length === 0 || !open}
                    onClick={() => setStep('fulfillment')}
                  >
                    Continue
                  </Button>
                </div>
              </>
            ) : step === 'fulfillment' ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOrderType('PICKUP')}
                      className={`rounded-[var(--radius)] border px-3 py-2.5 text-sm font-medium transition-colors ${
                        orderType === 'PICKUP' ? 'border-ember bg-ember/10 text-foreground' : 'border-border text-muted'
                      }`}
                    >
                      🥡 Pickup
                    </button>
                    <button
                      onClick={() => canDeliver && setOrderType('DELIVERY')}
                      disabled={!canDeliver}
                      className={`rounded-[var(--radius)] border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                        orderType === 'DELIVERY' ? 'border-ember bg-ember/10 text-foreground' : 'border-border text-muted'
                      }`}
                    >
                      🚴 Delivery
                    </button>
                  </div>
                  {!canDeliver ? (
                    <p className="text-xs text-muted">Delivery isn&rsquo;t available for this location.</p>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor="cName">Your name</Label>
                    <Input id="cName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cPhone">Phone</Label>
                    <Input id="cPhone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="So we can reach you" />
                  </div>

                  {orderType === 'DELIVERY' ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="dAddr">Delivery address</Label>
                        <Input id="dAddr" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Street, unit, city" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dNotes">Delivery notes (optional)</Label>
                        <Input id="dNotes" value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} placeholder="Gate code, landmark…" />
                      </div>
                    </>
                  ) : null}

                  {status === 'error' ? (
                    <p role="alert" className="text-sm text-ember-600">Couldn&rsquo;t get a delivery quote. Check the address and try again.</p>
                  ) : null}
                </div>
                <div className="space-y-3 border-t border-border px-5 py-4">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!fulfillmentReady || status === 'quoting'}
                    onClick={goToDetails}
                  >
                    {status === 'quoting' ? 'Getting quote…' : 'Continue'}
                  </Button>
                  <button className="w-full text-center text-xs text-muted hover:text-foreground" onClick={() => setStep('menu')}>
                    ← Back to cart
                  </button>
                </div>
              </>
            ) : step === 'details' ? (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gEmail">Email (optional)</Label>
                    <Input id="gEmail" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="For a receipt" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oNote">Note for the kitchen (optional)</Label>
                    <textarea
                      id="oNote"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      rows={2}
                      placeholder="Allergies, timing, a celebration…"
                      className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30"
                    />
                  </div>
                </div>
                <div className="space-y-3 border-t border-border px-5 py-4">
                  <Button className="w-full" size="lg" onClick={() => setStep('payment')}>
                    Continue
                  </Button>
                  <button className="w-full text-center text-xs text-muted hover:text-foreground" onClick={() => setStep('fulfillment')}>
                    ← Back
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Subtotal</span>
                    <span className="tabular-nums text-foreground">{formatMoney(subtotal)}</span>
                  </div>
                  {orderType === 'DELIVERY' ? (
                    <div className="flex justify-between">
                      <span className="text-muted">Delivery{quote?.etaMinutes ? ` · ~${quote.etaMinutes} min` : ''}</span>
                      <span className="tabular-nums text-foreground">{formatMoney(deliveryFee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-border pt-3 font-medium">
                    <span className="text-foreground">Total</span>
                    <span className="tabular-nums text-foreground">{formatMoney(grandTotal)}</span>
                  </div>
                  {status === 'error' ? (
                    <p role="alert" className="text-ember-600">Something went wrong. Please try again.</p>
                  ) : null}
                </div>
                <div className="space-y-3 border-t border-border px-5 py-4">
                  <Button className="w-full" size="lg" disabled={status === 'placing'} onClick={placeOrder}>
                    {status === 'placing' ? 'Placing…' : onlinePayment ? `Pay ${formatMoney(grandTotal)}` : 'Place order'}
                  </Button>
                  <button className="w-full text-center text-xs text-muted hover:text-foreground" onClick={() => setStep('details')}>
                    ← Back
                  </button>
                  <p className="text-center text-xs text-muted">
                    {onlinePayment
                      ? 'You will be charged securely now.'
                      : orderType === 'DELIVERY'
                        ? 'Pay on delivery.'
                        : 'Pay when you pick up.'}
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
