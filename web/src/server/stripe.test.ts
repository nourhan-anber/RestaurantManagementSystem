import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStripe, isBillingConfigured, isOnlinePaymentConfigured } from './stripe';

afterEach(() => vi.unstubAllEnvs());

describe('stripe configuration gates', () => {
  it('getStripe is null without a secret key', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(getStripe()).toBeNull();
  });

  it('isBillingConfigured requires both a secret key and a price id', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.stubEnv('STRIPE_PRICE_ID', '');
    expect(isBillingConfigured()).toBe(false);

    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
    vi.stubEnv('STRIPE_PRICE_ID', '');
    expect(isBillingConfigured()).toBe(false);

    vi.stubEnv('STRIPE_PRICE_ID', 'price_1');
    expect(isBillingConfigured()).toBe(true);
  });

  it('isOnlinePaymentConfigured requires a secret key and a webhook secret', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect(isOnlinePaymentConfigured()).toBe(false);

    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_1');
    expect(isOnlinePaymentConfigured()).toBe(true);
  });
});
