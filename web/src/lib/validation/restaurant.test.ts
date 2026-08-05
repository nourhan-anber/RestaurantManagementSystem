import { describe, expect, it } from 'vitest';
import { brandingSchema, createRestaurantSchema, hoursSchema, loyaltySchema } from './restaurant';

const validCreate = {
  name: 'Bella Vista',
  ownerName: 'Sam',
  ownerEmail: 'sam@bella.test',
  ownerPassword: 'longenough',
};

describe('createRestaurantSchema', () => {
  it('accepts valid input and normalizes email', () => {
    expect(createRestaurantSchema.parse({ ...validCreate, ownerEmail: 'SAM@Bella.test' }).ownerEmail).toBe('sam@bella.test');
  });
  it('rejects a short owner password', () => {
    expect(createRestaurantSchema.safeParse({ ...validCreate, ownerPassword: 'x' }).success).toBe(false);
  });
});

describe('brandingSchema', () => {
  it('accepts branding with optional fields omitted', () => {
    expect(brandingSchema.parse({ name: 'Bella', timezone: 'UTC', onlineOrderingEnabled: true }).name).toBe('Bella');
  });
  it('rejects an invalid logo URL', () => {
    expect(
      brandingSchema.safeParse({ name: 'Bella', timezone: 'UTC', onlineOrderingEnabled: false, logoUrl: 'nope' }).success,
    ).toBe(false);
  });
  it('rejects a too-short name', () => {
    expect(brandingSchema.safeParse({ name: 'B', timezone: 'UTC', onlineOrderingEnabled: false }).success).toBe(false);
  });
});

describe('hoursSchema', () => {
  const day = (dayOfWeek: number) => ({ dayOfWeek, isClosed: false, opensMinutes: 660, closesMinutes: 1320 });
  it('accepts exactly seven valid days', () => {
    expect(hoursSchema.safeParse([0, 1, 2, 3, 4, 5, 6].map(day)).success).toBe(true);
  });
  it('rejects fewer than seven days', () => {
    expect(hoursSchema.safeParse([0, 1].map(day)).success).toBe(false);
  });
  it('rejects out-of-range minutes', () => {
    expect(hoursSchema.safeParse([0, 1, 2, 3, 4, 5, 6].map((d) => ({ ...day(d), opensMinutes: 2000 }))).success).toBe(false);
  });
});

describe('loyaltySchema', () => {
  it('coerces the enabled flag and numeric config', () => {
    const parsed = loyaltySchema.safeParse({ loyaltyEnabled: true, pointsPerDollar: '2', redeemValuePerPoint: '0.01' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toEqual({ loyaltyEnabled: true, pointsPerDollar: 2, redeemValuePerPoint: 0.01 });
  });

  it('requires at least 1 point per dollar', () => {
    expect(loyaltySchema.safeParse({ loyaltyEnabled: false, pointsPerDollar: '0', redeemValuePerPoint: '0.01' }).success).toBe(false);
  });

  it('rejects a negative redemption value', () => {
    expect(loyaltySchema.safeParse({ loyaltyEnabled: true, pointsPerDollar: '1', redeemValuePerPoint: '-1' }).success).toBe(false);
  });
});
