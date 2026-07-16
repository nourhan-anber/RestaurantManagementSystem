import { describe, expect, it } from 'vitest';
import {
  isSubscriptionActive,
  mapStripeStatus,
  subscriptionAllowsWrite,
  subscriptionLabel,
} from './subscription';

describe('mapStripeStatus', () => {
  it.each([
    ['trialing', 'TRIALING'],
    ['active', 'ACTIVE'],
    ['past_due', 'PAST_DUE'],
    ['unpaid', 'PAST_DUE'],
    ['canceled', 'CANCELED'],
    ['incomplete_expired', 'CANCELED'],
    ['something_else', 'INACTIVE'],
  ] as const)('maps %s -> %s', (input, expected) => {
    expect(mapStripeStatus(input)).toBe(expected);
  });
});

describe('subscription gating', () => {
  it('active/trialing are active and can write', () => {
    for (const s of ['ACTIVE', 'TRIALING'] as const) {
      expect(isSubscriptionActive(s)).toBe(true);
      expect(subscriptionAllowsWrite(s)).toBe(true);
    }
  });

  it('past_due keeps write access (grace) but is not "active"', () => {
    expect(isSubscriptionActive('PAST_DUE')).toBe(false);
    expect(subscriptionAllowsWrite('PAST_DUE')).toBe(true);
  });

  it('canceled/inactive/null are read-only', () => {
    for (const s of ['CANCELED', 'INACTIVE', null] as const) {
      expect(subscriptionAllowsWrite(s)).toBe(false);
    }
  });
});

describe('subscriptionLabel', () => {
  it.each([
    ['ACTIVE', 'Active'],
    ['TRIALING', 'Trialing'],
    ['PAST_DUE', 'Past due'],
    ['CANCELED', 'Canceled'],
    ['INACTIVE', 'Not subscribed'],
    [null, 'Not subscribed'],
  ] as const)('labels %s', (status, label) => {
    expect(subscriptionLabel(status)).toBe(label);
  });
});
