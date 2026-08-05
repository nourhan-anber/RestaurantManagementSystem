import { describe, expect, it } from 'vitest';
import { planRefund } from './refund';

describe('planRefund', () => {
  it('refunds the full remaining balance when no amount is requested', () => {
    expect(planRefund({ amount: 30, refundedAmount: 0 })).toEqual({
      ok: true,
      refundAmount: 30,
      refundedTotal: 30,
      fullyRefunded: true,
    });
  });

  it('refunds a partial amount and stays not-fully-refunded', () => {
    expect(planRefund({ amount: 30, refundedAmount: 0 }, 10)).toEqual({
      ok: true,
      refundAmount: 10,
      refundedTotal: 10,
      fullyRefunded: false,
    });
  });

  it('accounts for prior refunds when computing the remaining balance', () => {
    expect(planRefund({ amount: 30, refundedAmount: 20 })).toEqual({
      ok: true,
      refundAmount: 10,
      refundedTotal: 30,
      fullyRefunded: true,
    });
    // Partial on top of a prior partial.
    expect(planRefund({ amount: 30, refundedAmount: 10 }, 5)).toEqual({
      ok: true,
      refundAmount: 5,
      refundedTotal: 15,
      fullyRefunded: false,
    });
  });

  it('rounds requested and computed amounts to cents', () => {
    expect(planRefund({ amount: 33.9, refundedAmount: 0 }, 11.305)).toMatchObject({
      ok: true,
      refundAmount: 11.31,
      refundedTotal: 11.31,
    });
  });

  it('rejects a payment with nothing left to refund', () => {
    expect(planRefund({ amount: 30, refundedAmount: 30 })).toEqual({ ok: false, reason: 'nothing_left' });
  });

  it('rejects a non-positive or non-finite requested amount', () => {
    expect(planRefund({ amount: 30, refundedAmount: 0 }, 0)).toEqual({ ok: false, reason: 'invalid_amount' });
    expect(planRefund({ amount: 30, refundedAmount: 0 }, -5)).toEqual({ ok: false, reason: 'invalid_amount' });
    expect(planRefund({ amount: 30, refundedAmount: 0 }, Number.NaN)).toEqual({ ok: false, reason: 'invalid_amount' });
  });

  it('rejects a request that exceeds the remaining balance', () => {
    expect(planRefund({ amount: 30, refundedAmount: 20 }, 15)).toEqual({ ok: false, reason: 'exceeds_remaining' });
  });
});
