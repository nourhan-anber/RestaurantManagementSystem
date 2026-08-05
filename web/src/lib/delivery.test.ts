import { describe, expect, it } from 'vitest';
import { isTerminalDeliveryStatus, mapUberStatus, mockFee } from './delivery';

describe('mapUberStatus', () => {
  it('maps the courier lifecycle to our statuses', () => {
    expect(mapUberStatus('pending')).toBe('REQUESTED');
    expect(mapUberStatus('pickup')).toBe('REQUESTED');
    expect(mapUberStatus('pickup_complete')).toBe('PICKED_UP');
    expect(mapUberStatus('dropoff')).toBe('PICKED_UP');
    expect(mapUberStatus('delivered')).toBe('DROPPED_OFF');
    expect(mapUberStatus('canceled')).toBe('CANCELLED');
    expect(mapUberStatus('returned')).toBe('FAILED');
  });

  it('returns null for an unknown status', () => {
    expect(mapUberStatus('teleported')).toBeNull();
    expect(mapUberStatus('')).toBeNull();
  });
});

describe('isTerminalDeliveryStatus', () => {
  it('flags only terminal states', () => {
    expect(isTerminalDeliveryStatus('DROPPED_OFF')).toBe(true);
    expect(isTerminalDeliveryStatus('CANCELLED')).toBe(true);
    expect(isTerminalDeliveryStatus('FAILED')).toBe(true);
    expect(isTerminalDeliveryStatus('REQUESTED')).toBe(false);
    expect(isTerminalDeliveryStatus('PICKED_UP')).toBe(false);
    expect(isTerminalDeliveryStatus('PENDING')).toBe(false);
  });
});

describe('mockFee', () => {
  it('is deterministic and within the expected band', () => {
    const a = mockFee('12 Vine Street, New York, NY');
    expect(a).toBe(mockFee('12 Vine Street, New York, NY'));
    expect(a).toBeGreaterThanOrEqual(4.99);
    expect(a).toBeLessThan(10);
  });

  it('ignores surrounding whitespace and case', () => {
    expect(mockFee('  1 Main St ')).toBe(mockFee('1 MAIN ST'));
  });

  it('quotes at most two decimal places', () => {
    const fee = mockFee('42 Some Road');
    expect(Number.isInteger(fee * 100)).toBe(true);
  });
});
