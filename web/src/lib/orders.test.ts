import { describe, expect, it } from 'vitest';
import { isOrderStatus, isTerminal, nextKitchenStatus } from './orders';

describe('isOrderStatus', () => {
  it('accepts valid enum values and rejects others', () => {
    expect(isOrderStatus('PREPARING')).toBe(true);
    expect(isOrderStatus('DELIVERED')).toBe(true);
    expect(isOrderStatus('bogus')).toBe(false);
    expect(isOrderStatus(null)).toBe(false);
    expect(isOrderStatus(3)).toBe(false);
  });
});

describe('nextKitchenStatus', () => {
  it('advances pending → preparing → ready → delivered', () => {
    expect(nextKitchenStatus('PENDING')).toBe('PREPARING');
    expect(nextKitchenStatus('PREPARING')).toBe('READY');
    expect(nextKitchenStatus('READY')).toBe('DELIVERED');
  });

  it('returns null for terminal or non-advancing statuses', () => {
    expect(nextKitchenStatus('DELIVERED')).toBeNull();
    expect(nextKitchenStatus('CANCELLED')).toBeNull();
    expect(nextKitchenStatus('CONFIRMED')).toBeNull();
  });
});

describe('isTerminal', () => {
  it('recognizes delivered and cancelled', () => {
    expect(isTerminal('DELIVERED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('PENDING')).toBe(false);
  });
});
