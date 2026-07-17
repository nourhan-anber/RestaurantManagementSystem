'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import { computeTip, TIP_PRESETS } from '@/lib/tip';
import { orderTotals } from '@/lib/discount';
import {
  requiresReference,
  SETTLE_METHODS,
  SETTLE_METHOD_LABELS,
  type SettleMethod,
} from '@/lib/payments';
import { settleTableBill, type SettleState } from '@/server/actions/orders';

const INITIAL: SettleState = {};

export interface SettleOrder {
  id: number;
  label: string;
  subtotal: number;
  tax: number;
  total: number;
}

export function SettleBill({
  slug,
  tableId,
  orders,
  taxLabel,
}: {
  slug: string;
  tableId: number;
  orders: SettleOrder[];
  taxLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<SettleMethod>('CARD');
  // Split the check: which of the table's open orders to settle now (default all).
  const [selectedIds, setSelectedIds] = useState<number[]>(() => orders.map((o) => o.id));
  const selected = orders.filter((o) => selectedIds.includes(o.id));
  const partial = selected.length > 0 && selected.length < orders.length;

  const subtotal = selected.reduce((s, o) => s + o.subtotal, 0);
  const tax = selected.reduce((s, o) => s + o.tax, 0);
  const amount = Math.round(selected.reduce((s, o) => s + o.total, 0) * 100) / 100;

  // Manager comp: a dollar discount off the (selected) bill, re-taxed on the discounted base.
  const [comp, setComp] = useState('');
  const [compReason, setCompReason] = useState('');
  const compAmount = Math.max(0, Number(comp) || 0);
  // Approximate the server's per-order re-tax with the aggregate rate for preview.
  const ratePercent = subtotal > 0 ? (tax / subtotal) * 100 : 0;
  const discounted = orderTotals(subtotal, compAmount, ratePercent, tax > 0);
  const netBill = discounted.total; // post-discount, pre-tip
  // Tip: a preset percentage of the (post-comp) bill, or a custom dollar amount.
  const [tipPreset, setTipPreset] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const presetTip = tipPreset != null ? computeTip(netBill, tipPreset) : 0;
  const tip = tipPreset != null ? presetTip : Math.max(0, Number(customTip) || 0);
  const grandTotal = Math.round((netBill + tip) * 100) / 100;

  const tableTotal = Math.round(orders.reduce((s, o) => s + o.total, 0) * 100) / 100;

  function toggleOrder(id: number) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const [state, formAction, pending] = useActionState(
    settleTableBill.bind(null, slug, tableId),
    INITIAL,
  );

  const [handled, setHandled] = useState<SettleState>(INITIAL);
  if (state.ok && state !== handled) {
    setHandled(state);
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="mt-4 w-full"
        onClick={() => setOpen(true)}
      >
        Close bill · {formatMoney(tableTotal)}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-[var(--radius)] bg-background p-5 shadow-xl">
            <h2 className="font-display text-lg text-foreground">Settle bill</h2>

            {orders.length > 1 ? (
              <div className="mt-3 space-y-1.5">
                <Label>Orders to settle</Label>
                <ul className="space-y-1">
                  {orders.map((o) => (
                    <li key={o.id}>
                      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(o.id)}
                            onChange={() => toggleOrder(o.id)}
                          />
                          <span className="text-foreground">{o.label}</span>
                        </span>
                        <span className="tabular-nums text-muted">{formatMoney(o.total)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {partial ? (
                  <p className="text-xs text-muted">Settling {selected.length} of {orders.length} — the table stays open.</p>
                ) : null}
              </div>
            ) : null}

            {tax > 0 ? (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="tabular-nums text-foreground">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{taxLabel}</span>
                  <span className="tabular-nums text-foreground">{formatMoney(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 font-medium">
                  <span className="text-foreground">Total</span>
                  <span className="tabular-nums text-foreground">{formatMoney(amount)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">Total {formatMoney(amount)}</p>
            )}

            <form action={formAction} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <div className="flex gap-2">
                  {SETTLE_METHODS.map((m) => (
                    <label
                      key={m}
                      className={`flex-1 cursor-pointer rounded-[var(--radius)] border px-3 py-2 text-center text-sm ${
                        method === m ? 'border-ember text-foreground' : 'border-border text-muted'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={m}
                        checked={method === m}
                        onChange={() => setMethod(m)}
                        className="sr-only"
                      />
                      {SETTLE_METHOD_LABELS[m]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comp">Comp / discount</Label>
                <div className="flex gap-2">
                  <Input
                    id="comp"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={comp}
                    onChange={(e) => setComp(e.target.value)}
                    placeholder="0.00"
                    className="w-28"
                  />
                  <Input
                    value={compReason}
                    onChange={(e) => setCompReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="flex-1"
                  />
                </div>
                <input type="hidden" name="discount" value={compAmount} />
                <input type="hidden" name="discountReason" value={compReason} />
              </div>

              <div className="space-y-1.5">
                <Label>Tip</Label>
                <div className="flex gap-2">
                  {TIP_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => { setTipPreset(pct); setCustomTip(''); }}
                      className={`flex-1 rounded-[var(--radius)] border px-2 py-2 text-center text-sm ${
                        tipPreset === pct ? 'border-ember text-foreground' : 'border-border text-muted'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTipPreset(null)}
                    className={`flex-1 rounded-[var(--radius)] border px-2 py-2 text-center text-sm ${
                      tipPreset === null ? 'border-ember text-foreground' : 'border-border text-muted'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {tipPreset === null ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder="Tip amount"
                  />
                ) : null}
              </div>

              {requiresReference(method) ? (
                <div className="space-y-1.5">
                  <Label htmlFor="transactionId">Transaction id</Label>
                  <Input id="transactionId" name="transactionId" required placeholder="POS auth code / reference" />
                </div>
              ) : null}

              <input type="hidden" name="tip" value={tip} />
              {selected.map((o) => (
                <input key={o.id} type="hidden" name="orderIds" value={o.id} />
              ))}

              {compAmount > 0 || tip > 0 ? (
                <div className="space-y-1 border-t border-border pt-2 text-sm">
                  {compAmount > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted">Comp</span>
                      <span className="tabular-nums text-ember-600">−{formatMoney(compAmount)}</span>
                    </div>
                  ) : null}
                  {tip > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted">Tip</span>
                      <span className="tabular-nums text-foreground">{formatMoney(tip)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-medium">
                    <span className="text-foreground">Charge</span>
                    <span className="tabular-nums text-foreground">{formatMoney(grandTotal)}</span>
                  </div>
                </div>
              ) : null}

              {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={pending || selected.length === 0}>
                  {pending ? 'Settling…' : `Mark paid · ${formatMoney(grandTotal)}`}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
