import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the Stripe accessor so we can exercise both the Stripe and manual paths.
const { getStripeMock } = vi.hoisted(() => ({ getStripeMock: vi.fn() }));
vi.mock('./stripe', () => ({ getStripe: getStripeMock }));

import { gatewayRefund } from './refunds';

afterEach(() => getStripeMock.mockReset());

describe('gatewayRefund', () => {
  it('routes through Stripe when configured and a PaymentIntent is present', async () => {
    const create = vi.fn().mockResolvedValue({ id: 're_123' });
    getStripeMock.mockReturnValue({ refunds: { create } });

    const res = await gatewayRefund({ stripePaymentIntentId: 'pi_1', amount: 11.31 });

    // Amount is converted to integer cents.
    expect(create).toHaveBeenCalledWith({ payment_intent: 'pi_1', amount: 1131 });
    expect(res).toEqual({ gatewayRefundId: 're_123', mode: 'stripe' });
  });

  it('records a manual void when Stripe is configured but the payment has no PaymentIntent', async () => {
    const create = vi.fn();
    getStripeMock.mockReturnValue({ refunds: { create } });

    expect(await gatewayRefund({ stripePaymentIntentId: null, amount: 5 })).toEqual({
      gatewayRefundId: null,
      mode: 'manual',
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('records a manual void when Stripe is unconfigured', async () => {
    getStripeMock.mockReturnValue(null);
    expect(await gatewayRefund({ stripePaymentIntentId: 'pi_1', amount: 5 })).toEqual({
      gatewayRefundId: null,
      mode: 'manual',
    });
  });
});
