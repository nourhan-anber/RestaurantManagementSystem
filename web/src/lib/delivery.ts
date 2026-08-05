import type { DeliveryStatus } from '@/generated/prisma/enums';

/**
 * Map an Uber Direct courier status to our DeliveryStatus. Uber emits lowercase
 * lifecycle strings on the delivery object and its webhooks. Unknown/unhandled
 * values return null so callers can ignore them rather than regress a delivery.
 */
export function mapUberStatus(uberStatus: string): DeliveryStatus | null {
  switch (uberStatus) {
    case 'pending':
    case 'pickup':
      return 'REQUESTED';
    case 'pickup_complete':
    case 'dropoff':
      return 'PICKED_UP';
    case 'delivered':
      return 'DROPPED_OFF';
    case 'canceled':
    case 'cancelled':
      return 'CANCELLED';
    case 'returned':
    case 'failed':
      return 'FAILED';
    default:
      return null;
  }
}

/** A terminal delivery status no longer transitions. */
export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return status === 'DROPPED_OFF' || status === 'CANCELLED' || status === 'FAILED';
}

/** Stable non-negative hash of a string (djb2). */
function hash(value: string): number {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 33) ^ value.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Deterministic courier fee for the mock provider (dollars). A fixed base plus a
 * stable per-address component so a given dropoff always quotes the same price.
 */
export function mockFee(dropoffAddress: string): number {
  const base = 4.99;
  const variable = (hash(dropoffAddress.trim().toLowerCase()) % 500) / 100; // 0.00–4.99
  return Math.round((base + variable) * 100) / 100;
}
