'use client';

import { useActionState } from 'react';
import { refundPaymentAction, type RefundState } from '@/server/actions/payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/format';

/** Per-payment refund control on the order-detail page (owner/manager only). */
export function RefundForm({
  slug,
  paymentId,
  orderId,
  remaining,
}: {
  slug: string;
  paymentId: string;
  orderId: number;
  remaining: number;
}) {
  const action = refundPaymentAction.bind(null, slug, paymentId, orderId);
  const [state, formAction, pending] = useActionState<RefundState, FormData>(action, {});

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-ember-600">Refund</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={remaining}
          placeholder={`Amount (max ${formatMoney(remaining)})`}
          className="w-40"
        />
        <Input name="reason" placeholder="Reason (optional)" className="max-w-xs" />
        <Button type="submit" size="sm" variant="ghost" className="text-ember-600" disabled={pending}>
          {pending ? '…' : 'Issue refund'}
        </Button>
      </form>
      {state.error ? <p className="mt-1 text-xs text-ember-600">{state.error}</p> : null}
      {state.ok ? <p className="mt-1 text-xs text-muted">Refund recorded.</p> : null}
      <p className="mt-1 text-xs text-muted">Leave the amount blank to refund the full remaining balance.</p>
    </details>
  );
}
