'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/format';
import { computeTip, TIP_PRESETS } from '@/lib/tip';
import {
  requiresReference,
  SETTLE_METHODS,
  SETTLE_METHOD_LABELS,
  type SettleMethod,
} from '@/lib/payments';
import { settleTableBill, type SettleState } from '@/server/actions/orders';

const INITIAL: SettleState = {};

export function SettleBill({
  slug,
  tableId,
  amount,
  subtotal,
  tax,
  taxLabel,
}: {
  slug: string;
  tableId: number;
  amount: number;
  subtotal: number;
  tax: number;
  taxLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<SettleMethod>('CARD');
  // Tip: a preset percentage of the bill, or a custom dollar amount when preset is null.
  const [tipPreset, setTipPreset] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const presetTip = tipPreset != null ? computeTip(amount, tipPreset) : 0;
  const tip = tipPreset != null ? presetTip : Math.max(0, Number(customTip) || 0);
  const grandTotal = Math.round((amount + tip) * 100) / 100;

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
        Close bill · {formatMoney(amount)}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-[var(--radius)] bg-background p-5 shadow-xl">
            <h2 className="font-display text-lg text-foreground">Settle bill</h2>
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

              {tip > 0 ? (
                <div className="space-y-1 border-t border-border pt-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Tip</span>
                    <span className="tabular-nums text-foreground">{formatMoney(tip)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-foreground">Charge</span>
                    <span className="tabular-nums text-foreground">{formatMoney(grandTotal)}</span>
                  </div>
                </div>
              ) : null}

              {state.error ? <p role="alert" className="text-sm text-ember-600">{state.error}</p> : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
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
